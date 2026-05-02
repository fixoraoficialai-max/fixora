import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess } from "@/lib/api/response";
import { addStudioSceneSchema, deleteStudioSceneSchema } from "@/lib/validations/studio";

// ─── POST /api/studio/scene — add a scene to a Studio project ─────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return ApiErrors.validation({ message: "Invalid JSON body" });
  }

  const parsed = addStudioSceneSchema.safeParse(body);
  if (!parsed.success) {
    return ApiErrors.validation(parsed.error.flatten().fieldErrors);
  }

  const { projectId, prompt, order } = parsed.data;

  // Verify ownership — user can only add scenes to their own projects
  const project = await db.project.findUnique({
    where: { id: projectId, userId: session.user.id, platform: "studio" },
    select: { id: true },
  });
  if (!project) return ApiErrors.notFound("Studio project");

  const scene = await db.scene.create({
    data: {
      projectId,
      prompt,
      order,
      notes: "studio", // marker to identify studio scenes
    },
    select: {
      id:        true,
      order:     true,
      prompt:    true,
      createdAt: true,
    },
  });

  return apiSuccess(scene, 201);
}

// ─── DELETE /api/studio/scene — remove a scene ────────────────────────────────

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return ApiErrors.validation({ message: "Invalid JSON body" });
  }

  const parsed = deleteStudioSceneSchema.safeParse(body);
  if (!parsed.success) {
    return ApiErrors.validation(parsed.error.flatten().fieldErrors);
  }

  const { sceneId } = parsed.data;

  // Verify ownership by traversing scene → project → userId
  const scene = await db.scene.findUnique({
    where: { id: sceneId },
    select: { id: true, project: { select: { userId: true } } },
  });

  if (!scene || scene.project.userId !== session.user.id) {
    return ApiErrors.notFound("Scene");
  }

  await db.scene.delete({ where: { id: sceneId } });

  return apiSuccess({ deleted: true });
}
