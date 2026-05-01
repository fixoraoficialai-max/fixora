import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { apiSuccess, ApiErrors, apiError } from "@/lib/api/response";
import { checkRateLimit, getClientIp } from "@/lib/security";
import { sendEmail } from "@/lib/email";
import { buildVerificationEmail } from "@/lib/email/templates";
import { logAudit, AuditAction } from "@/lib/audit";
import crypto from "crypto";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Token expires in 24 hours. */
const TOKEN_TTL_MS = 24 * 60 * 60_000;

/** Max 3 verification emails per 15 minutes per user — prevents spam abuse. */
const SEND_RATE_LIMIT = { limit: 3, windowMs: 15 * 60_000 };

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Generates a cryptographically secure, URL-safe token. */
function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** Builds the full verification URL sent in the email. */
function buildVerifyUrl(token: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL is not configured");
  return `${appUrl}/verify-email?token=${token}`;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/send-verification
 *
 * Sends (or re-sends) a verification email to the currently logged-in user.
 * Can only be called by authenticated users with an unverified email.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return ApiErrors.unauthorized();

  const userId = session.user.id;
  const email  = session.user.email;
  const ip     = getClientIp(req);

  // 1. Rate limit — prevents users from spamming the "resend" button
  if (!checkRateLimit(`send-verification:${userId}`, SEND_RATE_LIMIT)) {
    return ApiErrors.tooManyRequests();
  }

  // 2. Verify the email isn't already confirmed
  const user = await db.user.findUnique({
    where:  { id: userId },
    select: { emailVerified: true },
  });

  if (!user) return ApiErrors.unauthorized();

  if (user.emailVerified) {
    return apiError("ALREADY_VERIFIED", "Your email address is already verified.", 409);
  }

  // 3. Delete any previous tokens for this email (one active token at a time)
  await db.verificationToken.deleteMany({ where: { identifier: email } });

  // 4. Create a new token
  const token   = generateVerificationToken();
  const expires = new Date(Date.now() + TOKEN_TTL_MS);

  await db.verificationToken.create({
    data: { identifier: email, token, expires },
  });

  // 5. Send the email
  const sent = await sendEmail({
    to:      email,
    subject: "Verify your Fixora email address",
    html:    buildVerificationEmail(buildVerifyUrl(token)),
  });

  if (!sent) {
    // Clean up the token so the user can retry cleanly
    await db.verificationToken.deleteMany({ where: { identifier: email } });
    return ApiErrors.internal();
  }

  logAudit(AuditAction.REGISTER_SUCCESS, {
    userId,
    ip,
    metadata: { action: "verification_email_sent", email },
  });

  return apiSuccess({ sent: true });
}
