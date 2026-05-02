import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { configureFal } from "@/lib/fal";
import { submitStudioSceneJob } from "@/lib/fal/studio";
import { ApiErrors, apiSuccess } from "@/lib/api/response";
import { reserveCredits, releaseCredits } from "@/lib/credits";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security";
import { generateStudioSceneSchema } from "@/lib/validations/studio";

// ─── Constants ────────────────────────────────────────────────────────────────

const STUDIO_SCENE_CREDITS = 15;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parses the character image URL from the project's JSON description field.
 * Returns null if the description is malformed.
 */
function parseCharacterImageUrl(description: string | null): string | null {
  if (!description) return null;
  try {
    const parsed = JSON.parse(description) as { characterImageUrl?: string };
    return parsed.characterImageUrl ?? null;
  } catch {
    return null;
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();

  // 1. Rate limit — 3 scene generations per minute per user
  if (!checkRateLimit(`studio:${session.user.id}`, RATE_LIMITS.studio)) {
    return ApiErrors.tooManyRequests();
  }

  // 2. Parse and validate body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return ApiErrors.validation({ message: "Invalid JSON body" });
  }

  const parsed = generateStudioSceneSchema.safeParse(body);
  if (!parsed.success) {
    return ApiErrors.validation(parsed.error.flatten().fieldErrors);
  }

  const { projectId, sceneId, style } = parsed.data;
  const userId = session.user.id;

  // 3. Load project and verify ownership in one query
  const project = await db.project.findUnique({
    where: { id: projectId, userId, platform: "studio" },
    select: { id: true, description: true },
  });
  if (!project) return ApiErrors.notFound("Studio project");

  const characterImageUrl = parseCharacterImageUrl(project.description);
  if (!characterImageUrl) {
    return ApiErrors.validation({ message: "Studio project is missing the character image" });
  }

  // 4. Load scene and verify it belongs to this project
  const scene = await db.scene.findUnique({
    where: { id: sceneId, projectId },
    select: { id: true, prompt: true },
  });
  if (!scene) return ApiErrors.notFound("Scene");

  // 5. Atomic credit reservation
  const reserved = await reserveCredits(userId, STUDIO_SCENE_CREDITS);
  if (!reserved) return ApiErrors.insufficientCredits();

  try {
    configureFal();

    const { request_id } = await submitStudioSceneJob({
      characterImageUrl,
      sceneDescription: scene.prompt,
      style,
    });

    const video = await db.video.create({
      data: {
        userId,
        projectId,
        status:      "PENDING",
        creditsUsed: STUDIO_SCENE_CREDITS,
        metadata: {
          requestId: request_id,
          type:      "studio-scene",
          sceneId,
          projectId,
          style,
        },
      },
    });

    return apiSuccess({ jobId: video.id, requestId: request_id });
  } catch (err) {
    console.error("[studio/generate]", err);
    await releaseCredits(userId, STUDIO_SCENE_CREDITS).catch(() => null);
    return ApiErrors.internal();
  }
}
