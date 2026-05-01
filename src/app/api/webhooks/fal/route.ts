import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settleVideoCompletion, markVideoFailed } from "@/lib/credits";
import { isValidWebhookRequest } from "@/lib/security";

// ─── Payload shape from Fal.ai ────────────────────────────────────────────────

interface FalWebhookBody {
  request_id?: string;
  status?: string;
  payload?: {
    video?: { url: string };
  };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * Fal.ai Webhook handler.
 * Receives asynchronous notifications when video generation completes or fails.
 *
 * Security:
 *  - Authenticated via 'x-fal-signature' header (shared secret, constant-time compare).
 *  - Idempotent: replayed webhooks for already-settled jobs are safely ignored.
 *  - No user session required — this endpoint is called by Fal.ai servers, not by clients.
 */
export async function POST(req: NextRequest) {
  // ── Auth: validate shared secret via header ───────────────────────────────
  if (!isValidWebhookRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: FalWebhookBody;
  try {
    body = await req.json() as FalWebhookBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { request_id, status, payload } = body;

  if (!request_id || !status) {
    return NextResponse.json({ error: "Missing required fields: request_id, status" }, { status: 400 });
  }

  // ── Look up the pending job by Fal.ai request ID ─────────────────────────
  const video = await db.video.findFirst({
    where: { metadata: { path: ["requestId"], equals: request_id } },
    select: { id: true, userId: true, status: true, creditsUsed: true },
  });

  if (!video) {
    // Unknown request_id — log and acknowledge to prevent Fal.ai retries
    console.warn(`[webhook/fal] No record for requestId: ${request_id}`);
    return NextResponse.json({ received: true });
  }

  // ── Idempotency: ignore already-settled jobs ──────────────────────────────
  if (video.status === "COMPLETED" || video.status === "FAILED") {
    return NextResponse.json({ received: true });
  }

  // ── Settle the job ────────────────────────────────────────────────────────
  if (status === "OK") {
    const videoUrl = payload?.video?.url;
    if (!videoUrl) {
      // Fal.ai returned OK but no URL — treat as failure, no credits charged
      await markVideoFailed(video.id);
      console.error(`[webhook/fal] Status OK but no video URL for requestId: ${request_id}`);
    } else {
      await settleVideoCompletion(video.userId, video.id, videoUrl, video.creditsUsed);
      console.info(`[webhook/fal] Video ${video.id} COMPLETED`);
    }
  } else {
    await markVideoFailed(video.id);
    console.info(`[webhook/fal] Video ${video.id} FAILED (status: ${status})`);
  }

  return NextResponse.json({ received: true });
}
