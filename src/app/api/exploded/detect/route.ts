import { NextRequest } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth/config";
import { ApiErrors, apiSuccess } from "@/lib/api/response";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security";

// ─── Constants ────────────────────────────────────────────────────────────────

const MODEL = "claude-haiku-4-5";

const ACCEPTED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
type  AcceptedMediaType     = (typeof ACCEPTED_MEDIA_TYPES)[number];

// ─── Validation schema ────────────────────────────────────────────────────────

/**
 * Accepts either raw base64 from the browser (preferred — no Fal storage dependency)
 * or a public URL (legacy / future use). Exactly one field must be provided.
 */
const schema = z
  .object({
    imageBase64: z.string().min(1).optional(),
    mediaType:   z.enum(ACCEPTED_MEDIA_TYPES).optional(),
    imageUrl:    z.string().url().optional(),
  })
  .refine(
    (data) => Boolean(data.imageBase64 ?? data.imageUrl),
    { message: "Provide either imageBase64 or imageUrl" }
  );

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductComponent {
  name:        string;
  description: string;
}

// ─── Anthropic client (module-level singleton) ────────────────────────────────

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchImageAsBase64(
  url: string
): Promise<{ data: string; mediaType: AcceptedMediaType }> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Image fetch failed: ${res.status} ${res.statusText}`);
  }

  const buffer    = await res.arrayBuffer();
  const data      = Buffer.from(buffer).toString("base64");
  const ct        = res.headers.get("content-type") ?? "";
  const mediaType: AcceptedMediaType =
    ct.includes("png")  ? "image/png"  :
    ct.includes("webp") ? "image/webp" : "image/jpeg";

  return { data, mediaType };
}

function parseComponentsFromText(rawText: string): ProductComponent[] | null {
  try {
    const clean  = rawText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean) as unknown;

    if (!Array.isArray(parsed)) return null;

    const components = parsed.filter(
      (item): item is ProductComponent =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as Record<string, unknown>).name === "string" &&
        typeof (item as Record<string, unknown>).description === "string"
    );

    return components.length > 0 ? components : null;
  } catch {
    return null;
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return ApiErrors.unauthorized();

    const { id: userId } = session.user;

    if (!(await checkRateLimit(`exploded:${userId}`, RATE_LIMITS.exploded))) {
      return ApiErrors.tooManyRequests();
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return ApiErrors.validation({ message: "Invalid JSON body" });
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) return ApiErrors.validation(parsed.error.flatten().fieldErrors);

    // Resolve image data — prefer client-side base64 to avoid Fal storage dependency
    let imageData: string;
    let mediaType: AcceptedMediaType;

    if (parsed.data.imageBase64) {
      imageData = parsed.data.imageBase64;
      mediaType = parsed.data.mediaType ?? "image/jpeg";
    } else {
      const fetched = await fetchImageAsBase64(parsed.data.imageUrl!);
      imageData     = fetched.data;
      mediaType     = fetched.mediaType;
    }

    const message = await anthropic.messages.create({
      model:      MODEL,
      max_tokens: 600,
      system: [
        "You are a product analyst. Analyze the product in the image and identify its main components.",
        "Return ONLY a valid JSON array — no markdown, no explanation:",
        '[{"name": "Component name", "description": "Brief functional description max 6 words"}, ...]',
        "Rules:",
        "- Identify 4 to 8 main visible components",
        "- Names and descriptions in Spanish",
        "- Keep descriptions very short and functional",
        "- Order from top to bottom or outside to inside",
      ].join("\n"),
      messages: [
        {
          role:    "user",
          content: [
            {
              type:   "image",
              source: { type: "base64", media_type: mediaType, data: imageData },
            },
            {
              type: "text",
              text: "Identify all main components of this product. Return the JSON array.",
            },
          ],
        },
      ],
    });

    const rawText    = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
    const components = parseComponentsFromText(rawText);

    if (!components) {
      console.error("[exploded/detect] Unparseable Claude response:", rawText.slice(0, 200));
      return ApiErrors.internal();
    }

    return apiSuccess({ components });

  } catch (err) {
    console.error("[exploded/detect] Unhandled error:", err);
    return ApiErrors.internal();
  }
}
