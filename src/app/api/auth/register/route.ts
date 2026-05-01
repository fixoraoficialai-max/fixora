import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import crypto from "crypto";
import { db } from "@/lib/db";
import { apiSuccess, ApiErrors } from "@/lib/api/response";
import { checkRateLimit, getClientIp } from "@/lib/security";
import { logAudit, AuditAction } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { buildVerificationEmail } from "@/lib/email/templates";

// ─── Constants ────────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 12;
const TOKEN_TTL_MS  = 24 * 60 * 60_000; // 24 hours

// 5 registration attempts per 15 minutes per IP — prevents account farming
const REGISTER_RATE_LIMIT = { limit: 5, windowMs: 15 * 60_000 };

// ─── Email helper ─────────────────────────────────────────────────────────────

/**
 * Creates a verification token and sends the email.
 * Fire-and-forget: a failed email never blocks registration.
 */
async function sendVerificationEmail(userId: string, email: string): Promise<void> {
  const token   = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + TOKEN_TTL_MS);
  const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const verifyUrl = `${appUrl}/verify-email?token=${token}`;

  await db.verificationToken.deleteMany({ where: { identifier: email } });
  await db.verificationToken.create({ data: { identifier: email, token, expires } });

  await sendEmail({
    to:      email,
    subject: "Verify your Fixora email address",
    html:    buildVerificationEmail(verifyUrl),
  });
}

// ─── Validation ───────────────────────────────────────────────────────────────

const schema = z.object({
  name:     z.string().min(2, "Name too short").max(50, "Name too long").trim(),
  email:    z.string().email("Invalid email").toLowerCase().trim(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password too long")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain uppercase, lowercase, and a number"),
});

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  if (!checkRateLimit(`register:${ip}`, REGISTER_RATE_LIMIT)) {
    return ApiErrors.tooManyRequests();
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return ApiErrors.validation({ message: "Invalid JSON body" });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return ApiErrors.validation(parsed.error.flatten().fieldErrors);
  }

  const { name, email, password } = parsed.data;

  const existingUser = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    return ApiErrors.conflict("An account with this email already exists.");
  }

  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await db.user.create({
    data: { name, email, password: hashedPassword },
    select: { id: true, email: true },
  });

  // Idempotent credit provisioning — upsert prevents duplicates if the
  // NextAuth createUser event also fires (race condition safety net).
  await db.userCredits.upsert({
    where:  { userId: user.id },
    create: { userId: user.id, balance: 10, lifetime: 10 },
    update: {},
  });

  // Return minimal data — never expose internal IDs or credit state on register
  logAudit(AuditAction.REGISTER_SUCCESS, { userId: user.id, ip, metadata: { email: user.email } });

  // Fire-and-forget: send verification email without blocking the response
  sendVerificationEmail(user.id, user.email).catch((err) =>
    console.error("[register] Failed to send verification email:", err)
  );

  return apiSuccess({ email: user.email }, 201);
}
