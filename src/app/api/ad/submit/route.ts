import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { configureFal } from "@/lib/fal";
import { submitAdJob } from "@/lib/fal/ad";
import { ApiErrors, apiSuccess } from "@/lib/api/response";
import { reserveCredits, releaseCredits } from "@/lib/credits";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security";
import { adSubmitSchema } from "@/lib/validations/ad";

// ─── Constants ────────────────────────────────────────────────────────────────

const AD_CREDITS = 25;

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();

  // 1. Rate limit — 2 ad videos per 2 minutes per user
  if (!(await checkRateLimit(`ad:${session.user.id}`, RATE_LIMITS.ad))) {
    return ApiErrors.tooManyRequests();
  }

  // 2. Parse body — reject malformed JSON before touching the DB
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return ApiErrors.validation({ message: "Invalid JSON body" });
  }

  // 3. Validate — Zod guards every field before backend logic runs
  const parsed = adSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return ApiErrors.validation(parsed.error.flatten().fieldErrors);
  }

  const { characterImageUrl, productImageUrl, productName, style } = parsed.data;
  const userId = session.user.id;

  // 4. Atomic credit reservation — prevents race conditions on simultaneous requests
  const reserved = await reserveCredits(userId, AD_CREDITS);
  if (!reserved) return ApiErrors.insufficientCredits();

  try {
    configureFal();

    const { request_id } = await submitAdJob({
      characterImageUrl,
      productName,
      style,
    });

    const video = await db.video.create({
      data: {
        userId,
        status:       "PENDING",
        falRequestId: request_id,
        creditsUsed:  AD_CREDITS,
        metadata: {
          requestId:       request_id,
          type:            "ad",
          productName,
          style,
          productImageUrl, // stored for history display, not sent to Fal.ai
        },
      },
    });

    return apiSuccess({ jobId: video.id, requestId: request_id });
  } catch {
    // Fal.ai or DB failed AFTER credits were reserved — return them immediately
    await releaseCredits(userId, AD_CREDITS).catch(() => null);
    return ApiErrors.internal();
  }
}
