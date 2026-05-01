import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { createSceneSchema } from "@/lib/validations/project";
import { apiSuccess, ApiErrors } from "@/lib/api/response";

interface RouteContext {
  params: Promise<{ projectId: string }>;
}

const bulkCreateSchema = z.object({
  scenes: z.array(createSceneSchema).min(1).max(10),
});

// GET /api/scenes/[projectId] — list scenes for a project
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();

  const { projectId } = await params;

  // Verify project ownership
  const project = await db.project.findUnique({
    where: { id: projectId, userId: session.user.id },
    select: { id: true },
  });
  if (!project) return ApiErrors.notFound("Project");

  const scenes = await db.scene.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
  });

  return apiSuccess(scenes);
}

// POST /api/scenes/[projectId] — bulk create scenes
export async function POST(req: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();

  const { projectId } = await params;

  // Verify project ownership
  const project = await db.project.findUnique({
    where: { id: projectId, userId: session.user.id },
    select: { id: true },
  });
  if (!project) return ApiErrors.notFound("Project");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return ApiErrors.validation({ message: "Invalid JSON body" });
  }

  const parsed = bulkCreateSchema.safeParse(body);
  if (!parsed.success) {
    return ApiErrors.validation(parsed.error.flatten().fieldErrors);
  }

  // Delete existing scenes and replace with new ones (atomic)
  const scenes = await db.$transaction(async (tx) => {
    await tx.scene.deleteMany({ where: { projectId } });

    return tx.scene.createManyAndReturn({
      data: parsed.data.scenes.map((scene) => ({
        ...scene,
        projectId,
      })),
    });
  });

  return apiSuccess(scenes, 201);
}
