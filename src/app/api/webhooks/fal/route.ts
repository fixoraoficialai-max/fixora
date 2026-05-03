import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settleVideoCompletion, markVideoFailed } from "@/lib/credits";
import { verifyFalWebhookHmac } from "@/lib/security";

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
 *  - Authenticated via HMAC-SHA256 of the raw body (key = FAL_WEBHOOK_SECRET).
 *  - Raw body is read BEFORE JSON.parse so the signature covers exactly what was sent.
 *  - Idempotent: replayed webhooks for already-settled jobs are safely ignored.
 *  - No user session required — this endpoint is called by Fal.ai servers, not clients.
 */
export async function POST(req: NextRequest) {
  // ── Read raw body FIRST — required for HMAC verification ─────────────────
  const rawBody = await req.text();
  const signature = req.headers.get("x-fal-signature");

  if (!(await verifyFalWebhookHmac(rawBody, signature))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: FalWebhookBody;
  try {
    body = JSON.parse(rawBody) as FalWebhookBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { request_id, status, payload } = body;

  if (!request_id || !status) {
    return NextResponse.json({ error: "Missing required fields: request_id, status" }, { status: 400 });
  }

  // ── Look up the pending job by indexed falRequestId column (O(1) B-tree) ──
  const video = await db.video.findUnique({
    where:  { falRequestId: request_id },
    select: { id: true, userId: true, status: true, creditsUsed: true },
  });

  if (!video) {
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
      await markVideoFailed(video.id);
    } else {
      await settleVideoCompletion(video.userId, video.id, videoUrl, video.creditsUsed);
    }
  } else {
    await markVideoFailed(video.id);
  }

  return NextResponse.json({ received: true });
}
