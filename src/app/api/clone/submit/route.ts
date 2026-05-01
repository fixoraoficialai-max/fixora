import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { configureFal, fal } from "@/lib/fal";
import { ApiErrors, apiSuccess } from "@/lib/api/response";
import { checkCredits } from "@/lib/credits";
import { cloneSubmitSchema } from "@/lib/validations/clone";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security";

// ─── Constants ────────────────────────────────────────────────────────────────

const CLONE_CREDITS = 10;
const FAL_MODEL = "fal-ai/kling-video/v2.6/standard/motion-control" as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildWebhookUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL is not configured");
  // Webhook URL no longer embeds the secret in the query string.
  // Authentication is done via the 'x-fal-signature' request header in the webhook handler.
  return `${appUrl}/api/webhooks/fal`;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();

  // ── Rate limit: 3 clones/min per user ────────────────────────────────────
  if (!checkRateLimit(`clone:${session.user.id}`, RATE_LIMITS.clone)) {
    return ApiErrors.tooManyRequests();
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return ApiErrors.validation({ message: "Invalid JSON body" });
  }

  const parsed = cloneSubmitSchema.safeParse(body);
  if (!parsed.success) return ApiErrors.validation(parsed.error.flatten().fieldErrors);

  const { characterImageUrl, motionVideoUrl, prompt } = parsed.data;
  const userId = session.user.id;

  const hasCredits = await checkCredits(userId, CLONE_CREDITS);
  if (!hasCredits) return ApiErrors.insufficientCredits();

  try {
    configureFal();

    const falInput = {
      image_url: characterImageUrl,
      video_url: motionVideoUrl,
      prompt,
      character_orientation: "video" as const, // SDK requires "video" | "image" — not plain string
    };
    console.info("[clone/submit] Sending to Fal.ai:", JSON.stringify(falInput));

    const { request_id } = await fal.queue.submit(FAL_MODEL, {
      input: falInput,
      webhookUrl: buildWebhookUrl(),
    });

    const video = await db.video.create({
      data: {
        userId,
        status: "PENDING",
        creditsUsed: CLONE_CREDITS,
        metadata: { requestId: request_id, type: "clone" },
      },
    });

    return apiSuccess({ jobId: video.id, requestId: request_id });
  } catch (err) {
    console.error("[clone/submit]", err);
    return ApiErrors.internal();
  }
}
