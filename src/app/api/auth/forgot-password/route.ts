import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { sendEmail } from "@/lib/email";
import { buildPasswordResetEmail } from "@/lib/email/templates";
import { ApiErrors, apiSuccess } from "@/lib/api/response";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return ApiErrors.validation({ message: "Invalid JSON body" });
  }

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return ApiErrors.validation({ message: parsed.error.issues[0]?.message ?? "Invalid input" });
  }

  const { email } = parsed.data;

  // Rate limit by email — prevents email-spam abuse (3 resets / 15 min per address)
  if (!(await checkRateLimit(`forgotPassword:${email}`, RATE_LIMITS.forgotPassword))) {
    return ApiErrors.tooManyRequests();
  }

  // Security: always return success even if user doesn't exist — prevents email enumeration
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, password: true },
  });

  if (!user?.password) {
    return apiSuccess({});
  }

  const token   = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.verificationToken.deleteMany({ where: { identifier: email } });
  await db.verificationToken.create({ data: { identifier: email, token, expires } });

  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  const emailSent = await sendEmail({
    to: email,
    subject: "Reset your Fixora Video password",
    html: buildPasswordResetEmail(resetUrl),
  });

  if (!emailSent) {
    return ApiErrors.internal();
  }

  return apiSuccess({});
}
