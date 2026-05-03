import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { configureFal, fal } from "@/lib/fal";
import { ApiErrors, apiSuccess } from "@/lib/api/response";
import { settleVideoCompletion, markVideoFailed } from "@/lib/credits";
import { cloneStatusSchema } from "@/lib/validations/clone";

const FAL_MODEL = "fal-ai/kling-video/v2.6/standard/motion-control" as const;

type KlingResult = { video?: { url: string } };

/**
 * Fetches the video URL from the completed Fal.ai job.
 * NOTE: Kling can return 422 on result() if it rejected the content
 * (e.g. TikTok watermarks, NSFW, or policy violations) even after
 * status() shows COMPLETED. We surface this as a model rejection.
 */
async function fetchFalVideoUrl(requestId: string): Promise<string> {
  try {
    const result = await fal.queue.result(FAL_MODEL, { requestId });
    const url = (result.data as KlingResult)?.video?.url;
    if (!url) throw new Error("No video URL in result");
    return url;
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 422) {
      throw Object.assign(
        new Error("Kling rejected this content. Try a video without watermarks."),
        { status: 422, isKlingRejection: true }
      );
    }
    throw err;
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();

  let body: unknown;
  try { body = await req.json(); }
  catch { return ApiErrors.validation({ message: "Invalid JSON body" }); }

  const parsed = cloneStatusSchema.safeParse(body);
  if (!parsed.success) return ApiErrors.validation(parsed.error.flatten().fieldErrors);

  const { jobId, requestId } = parsed.data;
  const userId = session.user.id;

  const job = await db.video.findUnique({
    where: { id: jobId },
    select: { id: true, userId: true, status: true, url: true, creditsUsed: true },
  });

  if (!job || job.userId !== userId) return ApiErrors.notFound("Job");

  // If the webhook already completed this job, return immediately — no Fal.ai call needed.
  if (job.status === "COMPLETED" && job.url) {
    return apiSuccess({ status: "COMPLETED", videoUrl: job.url });
  }

  // If already failed, surface that without hitting Fal.ai.
  if (job.status === "FAILED") {
    return apiSuccess({ status: "FAILED", videoUrl: null });
  }

  try {
    configureFal();

    const falStatus = await fal.queue.status(FAL_MODEL, { requestId, logs: false });

    if (falStatus.status === "COMPLETED") {
      try {
        const videoUrl = await fetchFalVideoUrl(requestId);
        await settleVideoCompletion(userId, jobId, videoUrl, job.creditsUsed);
        return apiSuccess({ status: "COMPLETED", videoUrl });
      } catch (err) {
        // Kling completed but rejected the content (watermark, policy, etc.)
        const isKlingRejection = (err as { isKlingRejection?: boolean }).isKlingRejection;
        await markVideoFailed(jobId).catch(() => null);
        if (isKlingRejection) {
          return apiSuccess({
            status: "FAILED",
            videoUrl: null,
            reason: "El video de referencia no pudo procesarse. Usa un video sin marcas de agua (watermarks).",
          });
        }
        throw err; // unexpected error
      }
    }

    if ((falStatus.status as string) === "FAILED") {
      await markVideoFailed(jobId);
      return apiSuccess({ status: "FAILED", videoUrl: null });
    }

    return apiSuccess({ status: falStatus.status, videoUrl: null });
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 422) {
      await markVideoFailed(jobId).catch(() => null);
      return apiSuccess({ status: "FAILED", videoUrl: null });
    }
    return ApiErrors.internal();
  }
}
