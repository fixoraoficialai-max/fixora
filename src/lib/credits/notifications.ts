/**
 * Credit notification system.
 *
 * Responsibility: decide WHEN to send a low-credits email and send it.
 *
 * Rules:
 *  - Two thresholds: WARNING (≤ 5 credits) and CRITICAL (0 credits).
 *  - Idempotent: only one email per threshold per day (uses a DB flag).
 *  - Fire-and-forget: never throws, never blocks the caller.
 *  - Single entry point: checkAndNotifyLowCredits().
 */

import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { buildLowCreditsEmail } from "@/lib/email/templates";

// ─── Thresholds ───────────────────────────────────────────────────────────────

const WARNING_THRESHOLD  = 5;  // ≤ 5 → yellow warning
const CRITICAL_THRESHOLD = 0;  // = 0 → red critical

// ─── Entry Point ──────────────────────────────────────────────────────────────

/**
 * Checks the user's current balance and sends a notification email
 * if they've crossed a warning or critical threshold.
 *
 * FIRE AND FORGET — always call without await in hot paths.
 * A notification failure must never break the generation flow.
 */
export function checkAndNotifyLowCredits(userId: string, newBalance: number): void {
  // Only proceed if we're at or below the warning threshold
  if (newBalance > WARNING_THRESHOLD) return;

  // Defer to avoid blocking the caller
  sendCreditNotificationIfNeeded(userId, newBalance).catch((err) => {
    console.error("[credits/notify] Unexpected error:", err);
  });
}

// ─── Core Logic ───────────────────────────────────────────────────────────────

async function sendCreditNotificationIfNeeded(
  userId: string,
  balance: number
): Promise<void> {
  // Fetch user email + name + last notification state in one query
  const user = await db.user.findUnique({
    where:  { id: userId },
    select: {
      email:    true,
      name:     true,
      credits:  { select: { lastNotifiedAt: true, lastNotifiedBalance: true } },
    },
  });

  if (!user?.email) return;

  const lastNotifiedAt      = user.credits?.lastNotifiedAt      ?? null;
  const lastNotifiedBalance = user.credits?.lastNotifiedBalance  ?? null;

  // Determine which threshold was crossed
  const isCritical = balance <= CRITICAL_THRESHOLD;
  const isWarning  = !isCritical && balance <= WARNING_THRESHOLD;

  // Deduplicate: don't send another email if:
  //   1. We already notified at this exact balance today, OR
  //   2. We already notified at a LOWER balance (no need to go backwards)
  if (lastNotifiedAt && lastNotifiedBalance !== null) {
    const notifiedToday =
      new Date().toDateString() === new Date(lastNotifiedAt).toDateString();

    // If already sent a critical (0) and balance is still 0 — skip
    if (notifiedToday && lastNotifiedBalance <= balance) return;

    // If already warned today at the same or lower balance — skip
    if (notifiedToday && lastNotifiedBalance <= WARNING_THRESHOLD && !isCritical) return;
  }

  if (!isCritical && !isWarning) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://fixoravideo.com";
  const settingsUrl = `${appUrl}/settings`;

  const html = buildLowCreditsEmail(user.name, balance, settingsUrl);
  const subject = balance === 0
    ? "⚠️ You've run out of Fixora Video credits"
    : `⚡ Low credits alert — ${balance} remaining`;

  const sent = await sendEmail({ to: user.email, subject, html });

  if (sent) {
    // Record that we notified — prevents duplicate emails
    await db.userCredits.update({
      where: { userId },
      data:  {
        lastNotifiedAt:      new Date(),
        lastNotifiedBalance: balance,
      },
    });
  }
}
