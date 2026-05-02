import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { ApiErrors, apiSuccess } from "@/lib/api/response";
import { createStudioProjectSchema } from "@/lib/validations/studio";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Tag that distinguishes Studio projects from regular video projects. */
const STUDIO_PLATFORM = "studio" as const;

// ─── POST /api/studio/project — create a new Studio series ───────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return ApiErrors.validation({ message: "Invalid JSON body" });
  }

  const parsed = createStudioProjectSchema.safeParse(body);
  if (!parsed.success) {
    return ApiErrors.validation(parsed.error.flatten().fieldErrors);
  }

  const { name, characterImageUrl, storyDescription } = parsed.data;

  // Store character image URL and story description as JSON in the description field.
  // The `platform = "studio"` tag lets us filter Studio projects from regular ones.
  const descriptionJson = JSON.stringify({
    characterImageUrl,
    storyDescription: storyDescription ?? "",
  });

  const project = await db.project.create({
    data: {
      name,
      description: descriptionJson,
      platform:    STUDIO_PLATFORM,
      userId:      session.user.id,
    },
    select: {
      id:          true,
      name:        true,
      description: true,
      createdAt:   true,
    },
  });

  return apiSuccess(project, 201);
}
