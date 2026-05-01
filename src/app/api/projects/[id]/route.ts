import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { updateProjectSchema } from "@/lib/validations/project";
import { apiSuccess, ApiErrors } from "@/lib/api/response";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id] — get single project with scenes
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();

  const { id } = await params;

  const project = await db.project.findUnique({
    where: { id, userId: session.user.id },
    include: {
      scenes: { orderBy: { order: "asc" } },
      _count: { select: { videos: true } },
    },
  });

  if (!project) return ApiErrors.notFound("Project");

  return apiSuccess(project);
}

// PUT /api/projects/[id] — update project
export async function PUT(req: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();

  const { id } = await params;

  // Verify ownership
  const existing = await db.project.findUnique({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!existing) return ApiErrors.notFound("Project");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return ApiErrors.validation({ message: "Invalid JSON body" });
  }

  const parsed = updateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return ApiErrors.validation(parsed.error.flatten().fieldErrors);
  }

  const project = await db.project.update({
    where: { id },
    data: parsed.data,
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      aspectRatio: true,
      platform: true,
      updatedAt: true,
    },
  });

  return apiSuccess(project);
}

// DELETE /api/projects/[id] — delete project (cascades to scenes and videos)
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();

  const { id } = await params;

  // Verify ownership before deletion
  const existing = await db.project.findUnique({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!existing) return ApiErrors.notFound("Project");

  await db.project.delete({ where: { id } });

  return apiSuccess({ deleted: true });
}
