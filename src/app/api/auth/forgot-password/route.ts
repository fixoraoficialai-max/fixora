import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { sendEmail } from "@/lib/email";
import { buildPasswordResetEmail } from "@/lib/email/templates";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    // 1. Check if user exists
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, password: true },
    });

    // Security: Always return success even if user doesn't exist
    // to prevent email enumeration attacks.
    if (!user || !user.password) {
      return NextResponse.json({ success: true });
    }

    // 2. Generate secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    // 3. Save to database (upsert to overwrite any existing token for this email)
    // Prisma requires a unique identifier for upsert, or we can just delete and create.
    // Since @@unique([identifier, token]) is used, we'll just delete many by identifier.
    await db.verificationToken.deleteMany({
      where: { identifier: email },
    });

    await db.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });

    // 4. Send email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetUrl = `${appUrl}/reset-password?token=${token}`;
    
    const emailSent = await sendEmail({
      to: email,
      subject: "Reset your Fixora Video password",
      html: buildPasswordResetEmail(resetUrl),
    });

    if (!emailSent) {
      return NextResponse.json(
        { success: false, error: "Failed to send email. Please try again later." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[forgot-password] Error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
