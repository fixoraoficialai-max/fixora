import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { configureFal, fal } from "@/lib/fal";
import { ApiErrors, apiSuccess } from "@/lib/api/response";
import { reserveCredits, releaseCredits } from "@/lib/credits";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security";

// ─── Constants ────────────────────────────────────────────────────────────────

const IMAGE_CREDITS = 3;
const FAL_MODEL     = "fal-ai/flux-pro/v1.1" as const;

// Maps our internal AspectRatio enum to Fal.ai FLUX image_size values.
type FluxImageSize = "portrait_16_9" | "landscape_16_9" | "square_hd";

const ASPECT_SIZE_MAP: Record<string, FluxImageSize> = {
  PORTRAIT:  "portrait_16_9",   // 9:16 vertical
  LANDSCAPE: "landscape_16_9",  // 16:9 horizontal
  SQUARE:    "square_hd",       // 1:1
};

// ─── Input validation ─────────────────────────────────────────────────────────

const schema = z.object({
  prompt:      z.string().min(5, "Prompt too short").max(3000, "Prompt too long").trim(),
  aspectRatio: z.enum(["LANDSCAPE", "PORTRAIT", "SQUARE"]).default("PORTRAIT"),
});

type FluxResult = { images: Array<{ url: string }> };

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();

  // 1. Rate limit — 10 image generations/min per user
  if (!(await checkRateLimit(`image:${session.user.id}`, RATE_LIMITS.image))) {
    return ApiErrors.tooManyRequests();
  }

  // 2. Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return ApiErrors.validation({ message: "Invalid JSON body" });
  }

  // 3. Validate — Zod guards every field before backend logic runs
  const parsed = schema.safeParse(body);
  if (!parsed.success) return ApiErrors.validation(parsed.error.flatten().fieldErrors);

  const { prompt, aspectRatio } = parsed.data;
  const userId = session.user.id;

  // 4. Atomic credit reservation — prevents race conditions
  const reserved = await reserveCredits(userId, IMAGE_CREDITS);
  if (!reserved) return ApiErrors.insufficientCredits();

  try {
    configureFal();

    const result = await fal.run(FAL_MODEL, {
      input: {
        prompt,
        image_size:    ASPECT_SIZE_MAP[aspectRatio],
        num_images:    1,
        output_format: "jpeg",
      },
    }) as unknown as FluxResult;

    const imageUrl = result.images[0]?.url;
    if (!imageUrl) throw new Error("No image URL in Fal.ai response");

    // Persist to history — non-critical: isolated so any DB issue never
    // rolls back credits or blocks the successful image response.
    db.generatedImage.create({
      data: { userId, prompt, imageUrl, sceneText: null },
    }).catch((dbErr: unknown) => {
      console.error("[image/route] DB persist failed (non-critical):", dbErr instanceof Error ? dbErr.message : dbErr);
    });

    return apiSuccess({ imageUrl });

  } catch (err) {
    // Only Fal.ai failures reach here — release credits
    await releaseCredits(userId, IMAGE_CREDITS).catch(() => null);
    console.error("[image/route] Fal.ai generation error:", err instanceof Error ? err.message : err);
    return ApiErrors.internal();
  }


}
