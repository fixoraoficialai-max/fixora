import { type NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess } from "@/lib/api/response";

// ─── GET /api/admin/users ─────────────────────────────────────────────────────

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();
  if ((session.user as { role?: string }).role !== "ADMIN") return ApiErrors.forbidden();

  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id:           true,
      name:         true,
      email:        true,
      image:        true,
      role:         true,
      emailVerified:true,
      createdAt:    true,
      credits: {
        select: {
          balance:  true,
          lifetime: true,
        },
      },
      subscription: {
        select: {
          plan:   true,
          status: true,
          currentPeriodEnd: true,
        },
      },
      accounts: {
        select: { provider: true },
      },
    },
  });

  // Shape: flatten provider list
  const result = users.map((u) => ({
    id:            u.id,
    name:          u.name,
    email:         u.email,
    image:         u.image,
    role:          u.role,
    emailVerified: !!u.emailVerified,
    createdAt:     u.createdAt,
    providers:     u.accounts.map((a) => a.provider),
    credits: {
      balance:  u.credits?.balance  ?? 0,
      lifetime: u.credits?.lifetime ?? 0,
    },
    subscription: u.subscription
      ? {
          plan:      u.subscription.plan,
          status:    u.subscription.status,
          renewsAt:  u.subscription.currentPeriodEnd,
        }
      : null,
  }));

  return apiSuccess({ users: result, total: result.length });
}
