import { type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess } from "@/lib/api/response";
import { logAudit, AuditAction } from "@/lib/audit";

// ─── Validation ───────────────────────────────────────────────────────────────

const adjustSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  amount: z
    .number({ required_error: "amount is required" })
    .int("amount must be an integer")
    .min(-10_000, "Cannot remove more than 10,000 credits at once")
    .max(10_000, "Cannot add more than 10,000 credits at once")
    .refine((n) => n !== 0, "amount cannot be zero"),
  reason: z
    .string()
    .max(200, "Reason too long")
    .optional(),
});

// ─── PATCH /api/admin/credits ─────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();
  if ((session.user as { role?: string }).role !== "ADMIN") return ApiErrors.forbidden();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return ApiErrors.validation({ message: "Invalid JSON body" });
  }

  const parsed = adjustSchema.safeParse(body);
  if (!parsed.success) return ApiErrors.validation(parsed.error.flatten().fieldErrors);

  const { userId, amount, reason } = parsed.data;

  // Verify the target user exists
  const target = await db.user.findUnique({
    where:  { id: userId },
    select: { id: true, email: true },
  });
  if (!target) return ApiErrors.notFound("User");

  // Atomic adjustment — prevent balance going below 0 on deductions
  if (amount < 0) {
    // Deduction: ensure balance won't go negative
    const result = await db.$executeRaw`
      UPDATE user_credits
      SET balance = GREATEST(0, balance + ${amount})
      WHERE "userId" = ${userId}
    `;

    if (result === 0) {
      // No credits record — create one with 0 balance
      await db.userCredits.create({ data: { userId, balance: 0, lifetime: 0 } });
    }
  } else {
    // Addition: upsert — create record if user somehow doesn't have one
    await db.userCredits.upsert({
      where:  { userId },
      update: {
        balance:  { increment: amount },
        lifetime: { increment: amount },
      },
      create: { userId, balance: amount, lifetime: amount },
    });
  }

  logAudit(AuditAction.CREDITS_GRANTED, {
    userId:   session.user.id, // admin performing the action
    metadata: {
      targetUserId:  userId,
      targetEmail:   target.email,
      amount,
      reason:        reason ?? "manual_admin_adjustment",
      performedBy:   session.user.email,
    },
  });

  // Return updated balance
  const updated = await db.userCredits.findUnique({
    where:  { userId },
    select: { balance: true, lifetime: true },
  });

  return apiSuccess({ balance: updated?.balance ?? 0, lifetime: updated?.lifetime ?? 0 });
}
