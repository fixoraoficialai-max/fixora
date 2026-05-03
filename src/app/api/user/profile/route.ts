import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { updateProfileSchema } from "@/lib/validations/user";
import { ApiErrors, apiSuccess } from "@/lib/api/response";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();

  if (!(await checkRateLimit(`userProfile:${session.user.id}`, RATE_LIMITS.userProfile))) {
    return ApiErrors.tooManyRequests();
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return ApiErrors.validation({ message: "Invalid JSON body" });
  }

  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return ApiErrors.validation({ message: parsed.error.issues[0]?.message ?? "Invalid input" });
  }

  const { name } = parsed.data;

  const updatedUser = await db.user.update({
    where: { id: session.user.id },
    data: { name },
    select: { name: true },
  });

  return apiSuccess({ user: updatedUser });
}
