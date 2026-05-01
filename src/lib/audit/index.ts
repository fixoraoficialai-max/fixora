import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

// ─── Action Registry ──────────────────────────────────────────────────────────

/**
 * All auditable actions in the system.
 * Adding a new action here is the ONLY change needed to track it.
 * Never pass free strings — always use this enum.
 */
export const AuditAction = {
  // Auth
  LOGIN_SUCCESS:        "LOGIN_SUCCESS",
  LOGIN_FAILED:         "LOGIN_FAILED",
  LOGIN_LOCKED:         "LOGIN_LOCKED",
  REGISTER_SUCCESS:     "REGISTER_SUCCESS",
  // Credits
  CREDITS_RESERVED:     "CREDITS_RESERVED",
  CREDITS_RELEASED:     "CREDITS_RELEASED",
  // Video generation
  CLONE_SUBMITTED:      "CLONE_SUBMITTED",
  MULTI_CLONE_SUBMITTED: "MULTI_CLONE_SUBMITTED",
  VIDEO_COMPLETED:      "VIDEO_COMPLETED",
  VIDEO_FAILED:         "VIDEO_FAILED",
  // Security
  RATE_LIMITED:         "RATE_LIMITED",
  RECAPTCHA_FAILED:     "RECAPTCHA_FAILED",
} as const;

export type AuditAction = typeof AuditAction[keyof typeof AuditAction];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuditOptions {
  userId?: string;
  ip?: string;
  /** Only non-sensitive context: IDs, amounts, statuses. NEVER passwords or tokens. */
  metadata?: Prisma.InputJsonValue;
}

// ─── Single Entry Point ───────────────────────────────────────────────────────

/**
 * Records a security-relevant event to the audit log.
 *
 * FIRE AND FORGET — this function never throws and never blocks the caller.
 * A logging failure must never break the main request flow.
 */
export function logAudit(action: AuditAction, opts: AuditOptions = {}): void {
  db.auditLog
    .create({
      data: {
        action,
        userId: opts.userId ?? null,
        ip:     opts.ip     ?? null,
        metadata: opts.metadata !== undefined
          ? (opts.metadata as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    })
    .catch((err) => {
      // Log to console so it's visible in monitoring tools (e.g. Sentry)
      // but never propagate — a logging failure is not a critical error
      console.error("[audit] Failed to write audit log:", { action, ...opts, err });
    });
}
