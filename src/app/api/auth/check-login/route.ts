import { NextRequest } from "next/server";
import { apiSuccess, ApiErrors, apiError } from "@/lib/api/response";
import { getClientIp } from "@/lib/security";
import { getLoginLockout, recordFailedLogin, resetLoginAttempts } from "@/lib/security/lockout";
import { loginSchema } from "@/lib/validations/auth";
import { db } from "@/lib/db";
import { logAudit, AuditAction } from "@/lib/audit";
import bcrypt from "bcryptjs";

// ─── reCAPTCHA Verification ───────────────────────────────────────────────────

/**
 * Verifies a reCAPTCHA v2 token with Google's server-side API.
 * MUST be called server-side — the secret key must never reach the client.
 */
async function verifyRecaptcha(token: string): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    return true; // Allow in dev when key is not configured
  }

  const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token }),
  });

  const data = await res.json() as { success: boolean };
  return data.success === true;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/check-login
 *
 * Purpose: Pre-flight check before NextAuth's signIn().
 * Verifies:
 *   1. The account is not locked out (progressive penalty).
 *   2. The reCAPTCHA token is valid (when provided after a failed attempt).
 *   3. The credentials are correct (so we can track failures server-side).
 *
 * Returns the lockout status and whether credentials are valid so the client
 * can show the correct UI without exposing sensitive server-side logic.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return ApiErrors.validation({ message: "Invalid JSON body" });
  }

  // We only need the email to check lockout — validate it strictly
  const emailParse = loginSchema.pick({ email: true }).safeParse(body);
  if (!emailParse.success) {
    return ApiErrors.validation(emailParse.error.flatten().fieldErrors);
  }

  const email = emailParse.data.email;

  // 1. Check lockout before any DB call
  const lockout = await getLoginLockout(email);
  if (lockout.locked) {
    const seconds = Math.ceil(lockout.retryAfterMs / 1000);
    logAudit(AuditAction.LOGIN_LOCKED, { ip, metadata: { email, attempts: lockout.attempts } });
    return apiError(
      "ACCOUNT_LOCKED",
      `Too many failed attempts. Try again in ${seconds} seconds.`,
      429,
      { retryAfterMs: lockout.retryAfterMs, attempts: lockout.attempts }
    );
  }

  // 2. Verify reCAPTCHA if a token was provided (required after first failure)
  const parsed = body as Record<string, unknown>;
  const recaptchaToken = typeof parsed.recaptchaToken === "string" ? parsed.recaptchaToken : null;

  if (recaptchaToken) {
    const isHuman = await verifyRecaptcha(recaptchaToken);
    if (!isHuman) {
      logAudit(AuditAction.RECAPTCHA_FAILED, { ip, metadata: { email } });
      return apiError("RECAPTCHA_FAILED", "reCAPTCHA verification failed. Please try again.", 403);
    }
  }

  // 3. Validate credentials — record failure or reset on success
  const credParse = loginSchema.safeParse(body);
  if (!credParse.success) {
    return ApiErrors.validation(credParse.error.flatten().fieldErrors);
  }

  const user = await db.user.findUnique({
    where: { email: credParse.data.email },
    select: { id: true, password: true },
  });

  // Use constant-time compare even when user doesn't exist to prevent user enumeration
  const dummyHash = "$2b$12$invalidhashfortimingprotection000000000000000000000000";
  const passwordToCheck = user?.password ?? dummyHash;
  const isValid = await bcrypt.compare(credParse.data.password, passwordToCheck);

  if (!isValid || !user) {
    const newLockout = await recordFailedLogin(email);
    const afterLockout = await getLoginLockout(email);
    logAudit(AuditAction.LOGIN_FAILED, {
      ip,
      metadata: { email, attempts: afterLockout.attempts, locked: newLockout.locked },
    });
    return apiError(
      "INVALID_CREDENTIALS",
      "Invalid email or password.",
      401,
      {
        attempts: afterLockout.attempts,
        locked: newLockout.locked,
        retryAfterMs: newLockout.retryAfterMs,
      }
    );
  }

  // Success — clear the failure counter and log it
  await resetLoginAttempts(email);
  logAudit(AuditAction.LOGIN_SUCCESS, { userId: user.id, ip, metadata: { email } });
  return apiSuccess({ ok: true });
}
