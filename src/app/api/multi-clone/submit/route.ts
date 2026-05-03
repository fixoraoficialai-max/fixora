import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess } from "@/lib/api/response";
import { reserveCredits, releaseCredits } from "@/lib/credits";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security";
import { multiCloneSubmitSchema } from "@/lib/validations/multi-clone";
import { submitKlingMotionJob } from "@/lib/fal/kling";
import { configureFal } from "@/lib/fal";

const MULTI_CLONE_CREDITS = 40; // 10 credits × 4 images

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();

  // 1. Rate limiting — strictly limited: 1 multi-clone per 2 minutes per user
  if (!(await checkRateLimit(`multi-clone:${session.user.id}`, RATE_LIMITS.multiClone))) {
    return ApiErrors.tooManyRequests();
  }

  // 2. Input validation — no trash enters the backend
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return ApiErrors.validation({ message: "Invalid JSON body" });
  }

  const parsed = multiCloneSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return ApiErrors.validation(parsed.error.flatten().fieldErrors);
  }

  const { characterImageUrls, motionVideoUrl, prompt } = parsed.data;
  const userId = session.user.id;

  // 3. Atomic credit reservation — prevents race conditions and negative balances
  const reserved = await reserveCredits(userId, MULTI_CLONE_CREDITS);
  if (!reserved) return ApiErrors.insufficientCredits();

  try {
    configureFal();

    const submissionPromises = characterImageUrls.map((imageUrl, index) =>
      submitKlingMotionJob({
        image_url: imageUrl,
        video_url: motionVideoUrl,
        prompt: `${prompt} (Part ${index + 1})`,
      })
    );

    const results = await Promise.all(submissionPromises);

    const multiCloneId = crypto.randomUUID();

    const dbVideos = await Promise.all(
      results.map((res, index) =>
        db.video.create({
          data: {
            userId,
            status:       "PENDING",
            falRequestId: res.request_id,
            creditsUsed:  10,
            metadata: {
              requestId: res.request_id,
              type: "multi-clone-part",
              multiCloneId,
              partIndex: index,
            },
          },
        })
      )
    );

    return apiSuccess({
      multiCloneId,
      videoIds: dbVideos.map(v => v.id),
      requestIds: results.map(r => r.request_id),
    });

  } catch {
    // Fal.ai or DB failed AFTER credits were reserved — return them immediately
    await releaseCredits(userId, MULTI_CLONE_CREDITS).catch(() => null);
    return ApiErrors.internal();
  }
}

