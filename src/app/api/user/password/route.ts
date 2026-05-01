import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { changePasswordSchema } from "@/lib/validations/user";
import bcrypt from "bcryptjs";
import { logAudit, AuditAction } from "@/lib/audit";

/**
 * PATCH /api/user/password
 * Changes the authenticated user's password.
 * Requires current password verification. OAuth users are rejected cleanly.
 */
export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = changePasswordSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid input";
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    const { currentPassword, newPassword } = parsed.data;

    // 1. Fetch user — only retrieve what's needed
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, password: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // 2. Block OAuth-only accounts (no local password set)
    if (!user.password) {
      return NextResponse.json(
        { success: false, error: "Your account uses an external provider (e.g. Google). Password changes are not supported." },
        { status: 400 }
      );
    }

    // 3. Verify current password before allowing any change
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { success: false, error: "Incorrect current password" },
        { status: 400 }
      );
    }

    // 4. Hash and persist the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await db.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // 5. Record a LOGIN_SUCCESS audit entry to mark the password change event
    logAudit(AuditAction.LOGIN_SUCCESS, {
      userId: user.id,
      metadata: { event: "password_changed" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[change-password] Error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred while changing password" },
      { status: 500 }
    );
  }
}
