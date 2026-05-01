import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { createProjectSchema } from "@/lib/validations/project";
import { apiSuccess, ApiErrors } from "@/lib/api/response";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_PAGE_SIZE = 100;

// Validated against actual Prisma enum — z.enum enforces only known values, eliminating unsafe casts
const PROJECT_STATUS_VALUES = ["DRAFT", "IN_PROGRESS", "COMPLETED", "ARCHIVED"] as const;
const projectStatusSchema = z.enum(PROJECT_STATUS_VALUES).optional();

// ─── GET /api/projects — list user's own projects ─────────────────────────────

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();

  const { searchParams } = req.nextUrl;

  // Validate status against enum — reject unknown values instead of casting
  const rawStatus = searchParams.get("status") ?? undefined;
  const statusParsed = projectStatusSchema.safeParse(rawStatus);
  if (!statusParsed.success) {
    return ApiErrors.validation({ status: `Invalid status value. Allowed: ${PROJECT_STATUS_VALUES.join(", ")}` });
  }

  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "20", 10), 1), MAX_PAGE_SIZE);
  const cursor = searchParams.get("cursor") ?? undefined;

  const projects = await db.project.findMany({
    where: {
      userId: session.user.id,
      ...(statusParsed.data ? { status: statusParsed.data } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      aspectRatio: true,
      platform: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { scenes: true, videos: true } },
    },
  });

  const nextCursor = projects.length === limit ? projects[projects.length - 1]?.id : null;

  return apiSuccess({ projects, nextCursor });
}

// ─── POST /api/projects — create a new project ────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return ApiErrors.validation({ message: "Invalid JSON body" });
  }

  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return ApiErrors.validation(parsed.error.flatten().fieldErrors);
  }

  const project = await db.project.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      aspectRatio: parsed.data.aspectRatio,
      platform: parsed.data.platform,
      userId: session.user.id,
    },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      aspectRatio: true,
      platform: true,
      createdAt: true,
    },
  });

  return apiSuccess(project, 201);
}
