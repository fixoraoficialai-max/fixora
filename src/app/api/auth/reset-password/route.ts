import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resetPasswordSchema } from "@/lib/validations/auth";
import bcrypt from "bcryptjs";
import { logAudit, AuditAction } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid input";
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    const { password, token } = parsed.data;

    // 1. Find the token
    const existingToken = await db.verificationToken.findUnique({
      where: { token },
    });

    if (!existingToken) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 400 }
      );
    }

    // 2. Check if expired
    if (new Date() > existingToken.expires) {
      await db.verificationToken.delete({ where: { token } });
      return NextResponse.json(
        { success: false, error: "Token has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // 3. Find the associated user
    const user = await db.user.findUnique({
      where: { email: existingToken.identifier },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User no longer exists" },
        { status: 400 }
      );
    }

    // 4. Hash new password and update user
    const hashedPassword = await bcrypt.hash(password, 12);

    await db.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // 5. Delete the token
    await db.verificationToken.delete({
      where: { token },
    });

    // 6. Log audit event for security traceability
    logAudit(AuditAction.LOGIN_SUCCESS, {
      userId: user.id,
      metadata: { event: "password_reset_completed" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[reset-password] Error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
