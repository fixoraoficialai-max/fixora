import { type NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess } from "@/lib/api/response";
import { type Prisma } from "@prisma/client";

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
// Query params: page (default 1), limit (default 50, max 100), search, sortBy, sortDir

const PAGE_LIMIT_MAX = 100;
const PAGE_LIMIT_DEFAULT = 50;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();
  if ((session.user as { role?: string }).role !== "ADMIN") return ApiErrors.forbidden();

  const { searchParams } = req.nextUrl;

  const page    = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit   = Math.min(PAGE_LIMIT_MAX, Math.max(1, parseInt(searchParams.get("limit") ?? String(PAGE_LIMIT_DEFAULT), 10)));
  const search  = searchParams.get("search")?.trim() ?? "";
  const sortBy  = (searchParams.get("sortBy") ?? "createdAt") as "createdAt" | "email";
  const sortDir = (searchParams.get("sortDir") ?? "desc") as "asc" | "desc";

  const where: Prisma.UserWhereInput = search
    ? { OR: [
        { email: { contains: search, mode: "insensitive" } },
        { name:  { contains: search, mode: "insensitive" } },
      ] }
    : {};

  const orderBy: Prisma.UserOrderByWithRelationInput =
    sortBy === "email" ? { email: sortDir } : { createdAt: sortDir };

  // Parallel: paginated users + total count + aggregate stats
  const [users, total, activeCount, noCreditsCount, adminCount] = await Promise.all([
    db.user.findMany({
      where,
      orderBy,
      take:   limit,
      skip:   (page - 1) * limit,
      select: {
        id:            true,
        name:          true,
        email:         true,
        image:         true,
        role:          true,
        emailVerified: true,
        createdAt:     true,
        credits: {
          select: { balance: true, lifetime: true },
        },
        subscription: {
          select: { plan: true, status: true, currentPeriodEnd: true },
        },
        accounts: {
          select: { provider: true },
        },
      },
    }),
    db.user.count({ where }),
    db.subscription.count({ where: { status: "active" } }),
    db.userCredits.count({ where: { balance: { equals: 0 } } }),
    db.user.count({ where: { role: "ADMIN" } }),
  ]);

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
          plan:     u.subscription.plan,
          status:   u.subscription.status,
          renewsAt: u.subscription.currentPeriodEnd,
        }
      : null,
  }));

  return apiSuccess({
    users:  result,
    total,
    page,
    pages:  Math.ceil(total / limit),
    stats: {
      total:     total,
      active:    activeCount,
      noCredits: noCreditsCount,
      admins:    adminCount,
    },
  });
}
