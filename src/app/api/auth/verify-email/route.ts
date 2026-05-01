import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiSuccess, ApiErrors, apiError } from "@/lib/api/response";
import { z } from "zod";

// ─── Validation ───────────────────────────────────────────────────────────────

const schema = z.object({
  token: z
    .string({ required_error: "Token is required" })
    .length(64, "Invalid token format") // 32 bytes as hex = 64 chars
    .regex(/^[a-f0-9]+$/, "Invalid token format"),
});

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * GET /api/auth/verify-email?token=<hex_token>
 *
 * Consumes a one-time verification token and marks the user's email as verified.
 * No authentication required — the token itself is the proof of identity.
 */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("token");

  // 1. Validate token format before any DB call
  const parsed = schema.safeParse({ token: raw });
  if (!parsed.success) {
    return apiError("INVALID_TOKEN", "Invalid or missing verification token.", 400);
  }

  const { token } = parsed.data;

  // 2. Look up the token — must exist and not be expired
  const record = await db.verificationToken.findUnique({
    where: { token },
    select: { identifier: true, expires: true },
  });

  if (!record) {
    return apiError("TOKEN_NOT_FOUND", "This verification link is invalid or has already been used.", 404);
  }

  if (record.expires < new Date()) {
    // Clean up the expired token
    await db.verificationToken.delete({ where: { token } });
    return apiError("TOKEN_EXPIRED", "This verification link has expired. Please request a new one.", 410);
  }

  // 3. Mark the user's email as verified and delete the token atomically
  const user = await db.user.findUnique({
    where:  { email: record.identifier },
    select: { id: true, emailVerified: true },
  });

  if (!user) {
    await db.verificationToken.delete({ where: { token } });
    return apiError("USER_NOT_FOUND", "Account not found.", 404);
  }

  if (user.emailVerified) {
    // Email already verified — consume the token and return success
    await db.verificationToken.delete({ where: { token } });
    return apiSuccess({ verified: true, alreadyVerified: true });
  }

  // 4. Atomic: verify email + consume token in one transaction
  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data:  { emailVerified: new Date() },
    }),
    db.verificationToken.delete({ where: { token } }),
  ]);

  return apiSuccess({ verified: true });
}
