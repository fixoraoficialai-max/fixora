import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess } from "@/lib/api/response";

const schema = z.object({
  type: z.enum(["video", "image"]),
  id: z.string().cuid(),
});

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();

  let body: unknown;
  try { body = await req.json(); } catch { return ApiErrors.validation({ message: "Invalid JSON" }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return ApiErrors.validation(parsed.error.flatten().fieldErrors);

  const { type, id } = parsed.data;
  const userId = session.user.id;

  if (type === "video") {
    const video = await db.video.findUnique({ where: { id }, select: { userId: true } });
    if (!video || video.userId !== userId) return ApiErrors.notFound("Video");
    await db.video.delete({ where: { id } });
  } else {
    const image = await db.generatedImage.findUnique({ where: { id }, select: { userId: true } });
    if (!image || image.userId !== userId) return ApiErrors.notFound("Image");
    await db.generatedImage.delete({ where: { id } });
  }

  return apiSuccess({ deleted: true });
}
