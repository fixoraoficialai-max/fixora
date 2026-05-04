import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { configureFal, fal } from "@/lib/fal";
import { ApiErrors, apiSuccess } from "@/lib/api/response";
import { reserveCredits, releaseCredits } from "@/lib/credits";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security";

// ─── Constants ────────────────────────────────────────────────────────────────

const CREDITS_REQUIRED = 5;

// ─── Model resolution ─────────────────────────────────────────────────────────

/**
 * Real Fal.ai model IDs for Kling v1.6.
 * xai/grok-imagine-video does NOT exist on Fal.ai — Kling is the correct model.
 */
const FAL_MODEL_MAP = {
  kling_text: "fal-ai/kling-video/v1.6/standard/text-to-video",
  kling_image: "fal-ai/kling-video/v1.6/standard/image-to-video",
  minimax_text: "fal-ai/minimax-video/text-to-video",
  minimax_image: "fal-ai/minimax-video/image-to-video",
} as const;

const ASPECT_RATIO_MAP: Record<string, string> = {
  LANDSCAPE: "16:9",
  PORTRAIT: "9:16",
  SQUARE: "1:1",
};

// ─── Input validation ─────────────────────────────────────────────────────────

const schema = z.object({
  prompt: z.string().min(5, "Prompt too short").max(3000, "Prompt too long").trim(),
  imageUrl: z.string().url("imageUrl must be a valid URL").optional(),
  aspectRatio: z.enum(["LANDSCAPE", "PORTRAIT", "SQUARE"]).default("LANDSCAPE"),
  duration: z.enum(["5", "10"]).default("5"),
  model: z.enum(["kling", "minimax"]).default("kling"),
  projectId: z.string().cuid("Invalid project ID").optional(),
});

// ─── Pure resolution functions (each does ONE thing) ─────────────────────────

function resolveModel(
  model: "kling" | "minimax",
  hasImage: boolean
): string {
  if (model === "minimax") return hasImage ? FAL_MODEL_MAP.minimax_image : FAL_MODEL_MAP.minimax_text;
  return hasImage ? FAL_MODEL_MAP.kling_image : FAL_MODEL_MAP.kling_text;
}

function buildPayload(
  prompt: string,
  imageUrl: string | undefined,
  aspectRatio: string,
  duration: string
): Record<string, unknown> {
  const ratio = ASPECT_RATIO_MAP[aspectRatio] ?? "9:16";

  const base = {
    prompt,
    duration: parseInt(duration, 10),  // Kling API expects integer, not string
    aspect_ratio: ratio,
  };

  return imageUrl ? { ...base, image_url: imageUrl } : base;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

type VideoResult = { video?: { url: string }; videos?: Array<{ url: string }> };

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();

  // 5 generations/min per user
  if (!checkRateLimit(`generate:${session.user.id}`, RATE_LIMITS.generate)) {
    return ApiErrors.tooManyRequests();
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return ApiErrors.validation({ message: "Invalid JSON body" });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return ApiErrors.validation(parsed.error.flatten().fieldErrors);

  const { prompt, imageUrl, aspectRatio, duration, model, projectId } = parsed.data;
  const userId = session.user.id;

  // Verify project ownership before using projectId — prevents IDOR
  if (projectId) {
    const project = await db.project.findUnique({
      where: { id: projectId, userId },
      select: { id: true },
    });
    if (!project) return ApiErrors.notFound("Project");
  }

  // Atomic credit reservation — prevents race conditions on simultaneous requests
  const reserved = await reserveCredits(userId, CREDITS_REQUIRED);
  if (!reserved) return ApiErrors.insufficientCredits();

  const falModel = resolveModel(model, !!imageUrl);
  const payload = buildPayload(prompt, imageUrl, aspectRatio, duration);

  let outputUrl: string;
  try {
    configureFal();
    // fal.subscribe() handles Fal.ai's queue + polling — safer than fal.run() for video
    const result = await fal.subscribe(falModel, { input: payload }) as { data: VideoResult };
    const data = result?.data ?? (result as unknown as VideoResult);
    outputUrl = data?.video?.url ?? data?.videos?.[0]?.url ?? "";
    if (!outputUrl) throw new Error("No video URL in Fal.ai response");
  } catch (falErr) {
    // Credits reserved but generation failed — return them immediately
    await releaseCredits(userId, CREDITS_REQUIRED).catch(() => null);
    const msg = falErr instanceof Error ? falErr.message : String(falErr);
    console.error("[video/route] Fal.ai error:", msg, falErr);
    // Surface the real error so the client can show a useful message
    return ApiErrors.internal(msg);
  }

  // Persist video record (non-critical — video was already generated)
  try {
    const videoCreate = db.video.create({
      data: {
        projectId: projectId ?? null,
        userId,
        status: "COMPLETED",
        url: outputUrl,
        duration: parseInt(duration, 10),
        creditsUsed: CREDITS_REQUIRED,
      },
    });
    if (projectId) {
      const projectUpdate = db.project.update({ where: { id: projectId }, data: { status: "COMPLETED" } });
      await db.$transaction([videoCreate, projectUpdate]);
    } else {
      await videoCreate;
    }
  } catch {
    // Video was generated — return it even if DB persistence fails.
  }

  return apiSuccess({ videoUrl: outputUrl, duration: parseInt(duration, 10) });
}
