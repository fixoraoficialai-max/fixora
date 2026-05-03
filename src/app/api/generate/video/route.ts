import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { configureFal, fal } from "@/lib/fal";
import { ApiErrors, apiSuccess } from "@/lib/api/response";
import { checkCredits } from "@/lib/credits";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security";

// ─── Constants ────────────────────────────────────────────────────────────────

const CREDITS_REQUIRED = 5;

// ─── Model resolution ─────────────────────────────────────────────────────────

const FAL_MODEL_MAP = {
  grok_text:     "xai/grok-imagine-video/text-to-video",
  grok_image:    "xai/grok-imagine-video/image-to-video",
  grok_video:    "xai/grok-imagine-video/edit-video",
  veo_text:      "fal-ai/veo3/fast",
  veo_image:     "fal-ai/veo3.1/image-to-video",
  minimax_text:  "fal-ai/minimax-video/text-to-video",
  minimax_image: "fal-ai/minimax-video/image-to-video",
} as const;

const ASPECT_RATIO_MAP: Record<string, string> = {
  LANDSCAPE: "16:9",
  PORTRAIT:  "9:16",
  SQUARE:    "1:1",
};

// ─── Input validation ─────────────────────────────────────────────────────────

const schema = z.object({
  prompt:      z.string().min(5, "Prompt too short").max(3000, "Prompt too long").trim(),
  imageUrl:    z.string().url("imageUrl must be a valid URL").optional(),
  videoUrl:    z.string().url("videoUrl must be a valid URL").optional(),
  aspectRatio: z.enum(["LANDSCAPE", "PORTRAIT", "SQUARE"]).default("LANDSCAPE"),
  duration:    z.enum(["5", "10"]).default("5"),
  model:       z.enum(["grok", "veo", "minimax"]).default("grok"),
  projectId:   z.string().cuid("Invalid project ID").optional(),
});

// ─── Pure resolution functions (each does ONE thing) ─────────────────────────

function resolveModel(
  model: "grok" | "veo" | "minimax",
  hasImage: boolean,
  hasVideo: boolean
): string {
  if (hasVideo) return FAL_MODEL_MAP.grok_video;
  if (model === "veo")     return hasImage ? FAL_MODEL_MAP.veo_image     : FAL_MODEL_MAP.veo_text;
  if (model === "minimax") return hasImage ? FAL_MODEL_MAP.minimax_image  : FAL_MODEL_MAP.minimax_text;
  return hasImage ? FAL_MODEL_MAP.grok_image : FAL_MODEL_MAP.grok_text;
}

function buildPayload(
  model: string,
  prompt: string,
  imageUrl: string | undefined,
  videoUrl: string | undefined,
  aspectRatio: string,
  duration: string
): Record<string, unknown> {
  if (videoUrl) return { prompt, video_url: videoUrl };

  const ratio = ASPECT_RATIO_MAP[aspectRatio];

  if (model === "veo") {
    return imageUrl
      ? { prompt, image_url: imageUrl, generate_audio: true, aspect_ratio: ratio, duration: `${duration}s` }
      : { prompt, audio_enabled: true, aspect_ratio: ratio };
  }

  if (model === "minimax") {
    return imageUrl ? { prompt, image_url: imageUrl } : { prompt };
  }

  // grok — append audio guidance if not already present
  const finalPrompt = prompt.includes("AUDIO:")
    ? prompt
    : `${prompt} AUDIO: ambient sound effects matching the scene, natural background sounds.`;
  return imageUrl ? { prompt: finalPrompt, image_url: imageUrl } : { prompt: finalPrompt };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

type VideoResult = { video?: { url: string }; videos?: Array<{ url: string }> };

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();

  // ── Rate limit: 5 generations/min per user ────────────────────────────────
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

  const { prompt, imageUrl, videoUrl, aspectRatio, duration, model, projectId } = parsed.data;
  const userId = session.user.id;

  const hasCredits = await checkCredits(userId, CREDITS_REQUIRED);
  if (!hasCredits) return ApiErrors.insufficientCredits();

  const falModel = resolveModel(model, !!imageUrl, !!videoUrl);
  const payload  = buildPayload(model, prompt, imageUrl, videoUrl, aspectRatio, duration);

  let outputUrl: string;
  try {
    configureFal();
    const result = await fal.run(falModel, { input: payload }) as VideoResult;
    outputUrl = result.video?.url ?? result.videos?.[0]?.url ?? "";
    if (!outputUrl) throw new Error("No video URL in Fal.ai response");
  } catch (falErr) {
    const msg = falErr instanceof Error ? falErr.message : "Video generation failed";
    return ApiErrors.validation({ message: msg });
  }

  // ── Atomic: deduct credits + save video record together ───────────────────
  try {
    await db.$transaction([
      db.userCredits.update({
        where: { userId },
        data: { balance: { decrement: CREDITS_REQUIRED } },
      }),
      db.video.create({
        data: {
          projectId: projectId ?? null,
          userId,
          status: "COMPLETED",
          url: outputUrl,
          duration: parseInt(duration, 10),
          creditsUsed: CREDITS_REQUIRED,
        },
      }),
    ]);

    if (projectId) {
      await db.project.update({
        where: { id: projectId },
        data: { status: "COMPLETED" },
      });
    }
  } catch {
    // Video was generated — return it even if DB persistence fails.
    // A transient DB error should not cause the user to lose their result.
  }

  return apiSuccess({ videoUrl: outputUrl, duration: parseInt(duration, 10) });
}
