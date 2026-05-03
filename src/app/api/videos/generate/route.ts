import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { configureFal, fal } from "@/lib/fal";
import { getFalWebhookUrl } from "@/lib/fal/kling";
import { ApiErrors, apiSuccess } from "@/lib/api/response";
import { reserveCredits, releaseCredits } from "@/lib/credits";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security";

// ─── Constants ────────────────────────────────────────────────────────────────

const WIZARD_VIDEO_CREDITS = 1;
const FAL_MODEL = "fal-ai/minimax-video/text-to-video" as const;

// ─── Input validation ─────────────────────────────────────────────────────────

const schema = z.object({
  projectId: z.string().cuid("Invalid project ID"),
});

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();

  // 1. Rate limit — 2 wizard videos/2min per user
  if (!(await checkRateLimit(`wizardVideo:${session.user.id}`, RATE_LIMITS.wizardVideo))) {
    return ApiErrors.tooManyRequests();
  }

  // 2. Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return ApiErrors.validation({ message: "Invalid JSON body" });
  }

  // 3. Validate
  const parsed = schema.safeParse(body);
  if (!parsed.success) return ApiErrors.validation(parsed.error.flatten().fieldErrors);

  const { projectId } = parsed.data;
  const userId = session.user.id;

  // 4. Verify project ownership — prevents IDOR
  const project = await db.project.findUnique({
    where: { id: projectId, userId },
    select: { id: true, name: true },
  });
  if (!project) return ApiErrors.notFound("Project");

  // 5. Load scenes ordered by sequence
  const scenes = await db.scene.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
    select: { prompt: true },
  });
  if (scenes.length === 0) {
    return ApiErrors.validation({ message: "Project has no scenes" });
  }

  // 6. Atomic credit reservation
  const reserved = await reserveCredits(userId, WIZARD_VIDEO_CREDITS);
  if (!reserved) return ApiErrors.insufficientCredits();

  // Build a combined prompt from all scenes
  const combinedPrompt = scenes
    .map((s, i) => `Scene ${i + 1}: ${s.prompt}`)
    .join(". ");

  try {
    configureFal();

    const webhookUrl = getFalWebhookUrl();
    const { request_id } = await fal.queue.submit(FAL_MODEL, {
      input: { prompt: combinedPrompt },
      ...(webhookUrl ? { webhookUrl } : {}),
    });

    const video = await db.video.create({
      data: {
        userId,
        projectId,
        status:      "PENDING",
        creditsUsed: WIZARD_VIDEO_CREDITS,
        falRequestId: request_id,
        metadata:    { requestId: request_id, type: "wizard-video", projectId },
      },
    });

    return apiSuccess({ videoId: video.id });
  } catch {
    await releaseCredits(userId, WIZARD_VIDEO_CREDITS).catch(() => null);
    return ApiErrors.internal();
  }
}
