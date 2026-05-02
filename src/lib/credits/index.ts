import { db } from "@/lib/db";
import { logAudit, AuditAction } from "@/lib/audit";
import { checkAndNotifyLowCredits } from "@/lib/credits/notifications";

// ─── Reserve ──────────────────────────────────────────────────────────────────

/**
 * Atomically checks AND reserves credits in a single DB operation.
 *
 * WHY: A separate checkCredits() + decrement() has a race condition window.
 * Two simultaneous requests can both pass the check before either decrements,
 * resulting in a user spending more credits than they have (negative balance).
 *
 * FIX: Conditional UPDATE with WHERE balance >= required.
 * The DB engine serializes this at the row level — no race condition possible.
 *
 * Returns true if credits were reserved, false if insufficient balance.
 */
export async function reserveCredits(userId: string, required: number): Promise<boolean> {
  const result = await db.$executeRaw`
    UPDATE user_credits
    SET balance = balance - ${required}
    WHERE "userId" = ${userId}
      AND balance >= ${required}
  `;

  const success = result === 1;

  logAudit(AuditAction.CREDITS_RESERVED, {
    userId,
    metadata: { amount: required, success },
  });

  // Fire-and-forget: send low-credits email if the new balance is at a threshold.
  // We only read the balance on success to avoid an extra query on failed reservations.
  if (success) {
    db.userCredits
      .findUnique({ where: { userId }, select: { balance: true } })
      .then((record) => {
        if (record) checkAndNotifyLowCredits(userId, record.balance);
      })
      .catch(() => { /* notification failure must never break generation */ });
  }

  return success;
}

// ─── Release ──────────────────────────────────────────────────────────────────

/**
 * Returns previously reserved credits to the user.
 * Called when a generation fails AFTER credits were reserved.
 */
export async function releaseCredits(userId: string, amount: number): Promise<void> {
  await db.userCredits.update({
    where: { userId },
    data: { balance: { increment: amount } },
  });

  logAudit(AuditAction.CREDITS_RELEASED, {
    userId,
    metadata: { amount },
  });
}

// ─── Settle ───────────────────────────────────────────────────────────────────

/**
 * Marks a video as COMPLETED.
 *
 * Credits were already deducted atomically via reserveCredits() at submit time.
 * This function only updates the video status and URL — it does NOT touch credits.
 *
 * Previous bug: this function was calling balance.decrement() which caused
 * a double-charge. Fixed: credits are reserved once at submit, settled here
 * with no further deduction.
 */
export async function settleVideoCompletion(
  userId: string,
  videoId: string,
  videoUrl: string,
  creditsUsed: number
): Promise<void> {
  await db.video.update({
    where: { id: videoId },
    data: { status: "COMPLETED", url: videoUrl },
  });

  logAudit(AuditAction.VIDEO_COMPLETED, {
    userId,
    metadata: { videoId, creditsUsed },
  });
}

// ─── Fail ─────────────────────────────────────────────────────────────────────

/** Marks a video as FAILED. Credits are NOT touched — they were already released at submit. */
export async function markVideoFailed(videoId: string, userId?: string): Promise<void> {
  await db.video.update({
    where: { id: videoId },
    data: { status: "FAILED" },
  });

  logAudit(AuditAction.VIDEO_FAILED, {
    userId,
    metadata: { videoId },
  });
}

// ─── Read-only check ──────────────────────────────────────────────────────────

/**
 * Read-only balance check — use ONLY for display purposes (e.g. UI badge).
 * NEVER use this before a mutation — use reserveCredits() instead.
 */
export async function checkCredits(userId: string, required: number): Promise<boolean> {
  const record = await db.userCredits.findUnique({
    where: { userId },
    select: { balance: true },
  });
  return !!record && record.balance >= required;
}
