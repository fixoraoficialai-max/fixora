import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { updateProfileSchema } from "@/lib/validations/user";

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid input";
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    const { name } = parsed.data;

    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: { name },
      select: { name: true }, // Only return what's needed
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch {
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred while updating profile" },
      { status: 500 }
    );
  }
}
