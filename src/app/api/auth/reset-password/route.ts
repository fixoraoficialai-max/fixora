import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { ApiErrors, apiSuccess } from "@/lib/api/response";
import { logAudit, AuditAction } from "@/lib/audit";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return ApiErrors.validation({ message: "Invalid JSON body" });
  }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return ApiErrors.validation({ message: parsed.error.issues[0]?.message ?? "Invalid input" });
  }

  const { password, token } = parsed.data;

  // Rate limit by token — prevents brute-force against a known token
  if (!(await checkRateLimit(`resetPassword:${token}`, RATE_LIMITS.forgotPassword))) {
    return ApiErrors.tooManyRequests();
  }

  const existingToken = await db.verificationToken.findUnique({ where: { token } });

  if (!existingToken) {
    return ApiErrors.validation({ message: "Invalid or expired token" });
  }

  if (new Date() > existingToken.expires) {
    await db.verificationToken.delete({ where: { token } });
    return ApiErrors.validation({ message: "Token has expired. Please request a new one." });
  }

  const user = await db.user.findUnique({ where: { email: existingToken.identifier } });

  if (!user) {
    return ApiErrors.validation({ message: "User no longer exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await db.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  });

  await db.verificationToken.delete({ where: { token } });

  logAudit(AuditAction.PASSWORD_RESET, { userId: user.id });

  return apiSuccess({});
}
