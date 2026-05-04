import { NextRequest } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth/config";
import { ApiErrors, apiSuccess } from "@/lib/api/response";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security";

const schema = z.union([
  z.object({
    imageBase64: z.string().min(1),
    mediaType:   z.enum(["image/jpeg", "image/png", "image/webp"]).default("image/jpeg"),
  }),
  z.object({ imageUrl: z.string().url() }),
]);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function fetchImageAsBase64(
  url: string
): Promise<{ data: string; mediaType: "image/jpeg" | "image/png" | "image/webp" }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status} ${res.statusText}`);
  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const ct = res.headers.get("content-type") ?? "image/jpeg";
  const mediaType = ct.includes("png") ? "image/png" : ct.includes("webp") ? "image/webp" : "image/jpeg";
  return { data: base64, mediaType };
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return ApiErrors.unauthorized();

    if (!(await checkRateLimit(`exploded:${session.user.id}`, RATE_LIMITS.exploded))) {
      return ApiErrors.tooManyRequests();
    }

    let body: unknown;
    try { body = await req.json(); } catch { return ApiErrors.validation({ message: "Invalid JSON" }); }

    const parsed = schema.safeParse(body);
    if (!parsed.success) return ApiErrors.validation(parsed.error.flatten().fieldErrors);

    let imageData: string;
    let mediaType: "image/jpeg" | "image/png" | "image/webp";

    if ("imageBase64" in parsed.data) {
      // Direct base64 from client — no Fal storage required
      imageData = parsed.data.imageBase64;
      mediaType = parsed.data.mediaType;
    } else {
      // Legacy: fetch from URL
      const fetched = await fetchImageAsBase64(parsed.data.imageUrl);
      imageData = fetched.data;
      mediaType = fetched.mediaType;
    }

    const message = await anthropic.messages.create({
      model:      "claude-haiku-4-5",
      max_tokens: 600,
      system: `You are a product analyst. Analyze the product in the image and identify its main components.
Return ONLY a valid JSON array with this format (no markdown, no explanation):
[{"name": "Component name", "description": "Brief functional description max 6 words"}, ...]
Rules:
- Identify 4 to 8 main visible components
- Names in the same language as the product context (Spanish preferred)
- Keep descriptions very short and functional
- Order from top to bottom or outside to inside`,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: imageData } },
          { type: "text", text: "Identify all main components of this product. Return the JSON array." },
        ],
      }],
    });

    const block   = message.content[0];
    const rawText = block?.type === "text" ? block.text.trim() : "[]";

    let components: Array<{ name: string; description: string }> = [];
    try {
      const clean  = rawText.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      if (!Array.isArray(parsed)) return ApiErrors.internal();
      components = parsed.filter(
        (item): item is { name: string; description: string } =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as Record<string, unknown>).name === "string" &&
          typeof (item as Record<string, unknown>).description === "string"
      );
    } catch {
      return ApiErrors.internal();
    }

    return apiSuccess({ components });
  } catch (err) {
    console.error("[exploded/detect]", err);
    return ApiErrors.internal();
  }
}
