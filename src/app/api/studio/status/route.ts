import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { configureFal, fal } from "@/lib/fal";
import { ApiErrors, apiSuccess } from "@/lib/api/response";
import { settleVideoCompletion, markVideoFailed } from "@/lib/credits";
import { studioStatusSchema } from "@/lib/validations/studio";
import { STUDIO_MODEL } from "@/lib/fal/studio";

// ─── Types ────────────────────────────────────────────────────────────────────

type MinimaxResult = { video?: { url: string } };

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Fetches the completed video URL from the Fal.ai result. Single responsibility. */
async function fetchStudioVideoUrl(requestId: string): Promise<string> {
  const result = await fal.queue.result(STUDIO_MODEL, { requestId });
  const url = (result.data as MinimaxResult)?.video?.url;
  if (!url) throw new Error("No video URL in Fal.ai result");
  return url;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return ApiErrors.validation({ message: "Invalid JSON body" });
  }

  const parsed = studioStatusSchema.safeParse(body);
  if (!parsed.success) {
    return ApiErrors.validation(parsed.error.flatten().fieldErrors);
  }

  const { jobId, requestId } = parsed.data;
  const userId = session.user.id;

  const job = await db.video.findUnique({
    where: { id: jobId },
    select: { id: true, userId: true, status: true, url: true, creditsUsed: true },
  });

  if (!job || job.userId !== userId) return ApiErrors.notFound("Job");

  // Already settled — return from DB without hitting Fal.ai
  if (job.status === "COMPLETED" && job.url) {
    return apiSuccess({ status: "COMPLETED", videoUrl: job.url });
  }
  if (job.status === "FAILED") {
    return apiSuccess({ status: "FAILED", videoUrl: null });
  }

  try {
    configureFal();

    const falStatus = await fal.queue.status(STUDIO_MODEL, { requestId, logs: false });

    if (falStatus.status === "COMPLETED") {
      const videoUrl = await fetchStudioVideoUrl(requestId);
      await settleVideoCompletion(userId, jobId, videoUrl, job.creditsUsed);
      return apiSuccess({ status: "COMPLETED", videoUrl });
    }

    if ((falStatus.status as string) === "FAILED") {
      await markVideoFailed(jobId);
      return apiSuccess({ status: "FAILED", videoUrl: null });
    }

    return apiSuccess({ status: falStatus.status, videoUrl: null });
  } catch {
    return ApiErrors.internal();
  }
}
