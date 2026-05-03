import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { changePasswordSchema } from "@/lib/validations/user";
import { ApiErrors, apiSuccess } from "@/lib/api/response";
import { logAudit, AuditAction } from "@/lib/audit";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security";
import bcrypt from "bcryptjs";

/**
 * PATCH /api/user/password
 * Changes the authenticated user's password.
 * Rate-limited per user to prevent bcrypt-based CPU DoS.
 */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();

  // bcrypt.compare is ~100ms CPU — rate limit prevents parallel DoS
  if (!(await checkRateLimit(`userPassword:${session.user.id}`, RATE_LIMITS.userPassword))) {
    return ApiErrors.tooManyRequests();
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return ApiErrors.validation({ message: "Invalid JSON body" });
  }

  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return ApiErrors.validation({ message: parsed.error.issues[0]?.message ?? "Invalid input" });
  }

  const { currentPassword, newPassword } = parsed.data;

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, password: true },
  });

  if (!user) return ApiErrors.notFound("User");

  if (!user.password) {
    return ApiErrors.validation({
      message: "Your account uses an external provider (e.g. Google). Password changes are not supported.",
    });
  }

  const isValid = await bcrypt.compare(currentPassword, user.password);
  if (!isValid) {
    return ApiErrors.validation({ message: "Incorrect current password" });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await db.user.update({ where: { id: user.id }, data: { password: hashedPassword } });

  logAudit(AuditAction.PASSWORD_CHANGED, { userId: user.id });

  return apiSuccess({});
}
