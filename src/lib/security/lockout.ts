/**
 * Persistent login lockout module.
 *
 * Runs in Node.js API routes ONLY — never in Edge middleware (Prisma is not Edge-compatible).
 * Replaces the previous in-memory Map implementation with DB-backed persistence.
 *
 * Policy (progressive, exponential):
 *   0-2 failures  → No lockout
 *   3   failures  → Locked for 1 minute
 *   6   failures  → Locked for 2 minutes
 *   9   failures  → Locked for 4 minutes
 *   12  failures  → Locked for 8 minutes
 *   15+ failures  → Locked for 60 minutes (hard cap)
 */

import { db } from "@/lib/db";

// ─── Constants ────────────────────────────────────────────────────────────────

const LOCKOUT_THRESHOLD = 3;
const MAX_LOCKOUT_MS = 60 * 60_000; // 60 minutes

// ─── Pure helpers ─────────────────────────────────────────────────────────────

/** Normalizes email to prevent case-variation bypass attacks. */
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/** Computes lockout duration for a given failure count. Doubles every threshold. */
function computeLockoutMs(count: number): number {
  const tier = Math.floor(count / LOCKOUT_THRESHOLD) - 1;
  const ms = 60_000 * Math.pow(2, tier); // 1min → 2min → 4min → ...
  return Math.min(ms, MAX_LOCKOUT_MS);
}

/** Returns true if the given lockout timestamp is still in the future. */
function isStillLocked(lockedUntil: Date | null): boolean {
  return lockedUntil !== null && lockedUntil > new Date();
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface LockoutStatus {
  locked: boolean;
  retryAfterMs: number;
  attempts: number;
}

/** Returns the current lockout status for the given email. */
export async function getLoginLockout(email: string): Promise<LockoutStatus> {
  const record = await db.loginAttempt.findUnique({
    where: { email: normalizeEmail(email) },
    select: { count: true, lockedUntil: true },
  });

  if (!record) return { locked: false, retryAfterMs: 0, attempts: 0 };

  if (isStillLocked(record.lockedUntil)) {
    const retryAfterMs = record.lockedUntil!.getTime() - Date.now();
    return { locked: true, retryAfterMs, attempts: record.count };
  }

  return { locked: false, retryAfterMs: 0, attempts: record.count };
}

/**
 * Records a failed login attempt and applies lockout if threshold is reached.
 * Returns the resulting lockout status.
 */
export async function recordFailedLogin(
  email: string
): Promise<Pick<LockoutStatus, "locked" | "retryAfterMs">> {
  const key = normalizeEmail(email);
  const existing = await db.loginAttempt.findUnique({
    where: { email: key },
    select: { count: true, lockedUntil: true },
  });

  // If previous lockout expired, restart the count from 1
  const shouldReset = existing !== null && !isStillLocked(existing.lockedUntil);
  const newCount = shouldReset ? 1 : (existing?.count ?? 0) + 1;

  const shouldLock = newCount >= LOCKOUT_THRESHOLD && newCount % LOCKOUT_THRESHOLD === 0;
  const lockMs = shouldLock ? computeLockoutMs(newCount) : 0;
  const lockedUntil = shouldLock ? new Date(Date.now() + lockMs) : null;

  await db.loginAttempt.upsert({
    where: { email: key },
    create: { email: key, count: newCount, lockedUntil },
    update: { count: newCount, lockedUntil },
  });

  return { locked: shouldLock, retryAfterMs: lockMs };
}

/** Clears all login attempts for an email after a successful login. */
export async function resetLoginAttempts(email: string): Promise<void> {
  await db.loginAttempt.deleteMany({
    where: { email: normalizeEmail(email) },
  });
}
