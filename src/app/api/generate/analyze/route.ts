import { NextRequest } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth/config";
import { ApiErrors, apiSuccess } from "@/lib/api/response";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security";
import type { DiagramLabel } from "@/components/DiagramOverlay";

const schema = z.object({
  imageUrl:  z.string().url(),
  labels:    z.array(z.object({
    text:        z.string(),
    description: z.string().optional(),
    anchorX:     z.number().min(0).max(1),
    anchorY:     z.number().min(0).max(1),
  })).min(1).max(20),
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function fetchImageAsBase64(url: string): Promise<{ data: string; mediaType: "image/jpeg" | "image/png" | "image/webp" }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const buffer     = await res.arrayBuffer();
  const base64     = Buffer.from(buffer).toString("base64");
  const ct         = res.headers.get("content-type") ?? "image/jpeg";
  const mediaType  = ct.includes("png") ? "image/png" : ct.includes("webp") ? "image/webp" : "image/jpeg";
  return { data: base64, mediaType };
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return ApiErrors.unauthorized();

    // Rate limit: máximo 10 análisis por minuto por usuario (mismo límite que imágenes)
    if (!(await checkRateLimit(`analyze:${session.user.id}`, RATE_LIMITS.image))) {
      return ApiErrors.tooManyRequests();
    }

    let body: unknown;
    try { body = await req.json(); }
    catch { return ApiErrors.validation({ message: "Invalid JSON" }); }

    const parsed = schema.safeParse(body);
    if (!parsed.success) return ApiErrors.validation(parsed.error.flatten().fieldErrors);

    const { imageUrl, labels } = parsed.data;

    // Descargar imagen para enviarla a Claude Vision
    const { data: imageData, mediaType } = await fetchImageAsBase64(imageUrl);

    const labelNames = labels.map((l) => l.text).join(", ");

    const message = await anthropic.messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 800,
      system: `You are a precise anatomical image analyzer for a diagram labeling system.

TASK: Analyze the image and find the EXACT pixel center of each anatomical or structural element listed.

COORDINATE SYSTEM:
- anchorX: 0.0 = left edge, 1.0 = right edge of image
- anchorY: 0.0 = top edge, 1.0 = bottom edge of image
- Point to the VISUAL CENTER of each element, not its label or border

CRITICAL RULES:
1. Scan the entire image carefully before assigning coordinates
2. Each element gets its OWN unique coordinates — never repeat the same coords
3. Spread labels across the full image — avoid clustering near 0.5, 0.5
4. For layered diagrams (cross-sections): assign Y based on actual vertical position of each layer
5. For side-view anatomical diagrams: trace each structure precisely
6. Elements at the TOP of the image should have anchorY near 0.1-0.25
7. Elements at the BOTTOM should have anchorY near 0.75-0.95
8. Elements on the LEFT should have anchorX near 0.1-0.35
9. Elements on the RIGHT should have anchorX near 0.65-0.90

OUTPUT FORMAT: Return ONLY a valid JSON array, no markdown, no explanation:
[{"text": "ElementName", "anchorX": 0.35, "anchorY": 0.22}, ...]`,
      messages: [{
        role: "user",
        content: [
          {
            type:   "image",
            source: { type: "base64", media_type: mediaType, data: imageData },
          },
          {
            type: "text",
            text: `This is a cross-section or anatomical diagram. Carefully examine the image and find the EXACT visual center of each element listed below.

Elements to locate: ${labelNames}

Instructions:
- Look at where each element actually IS in the image
- For layered structures: assign Y coordinates based on the real vertical position of each layer
- Top layers get low anchorY (0.1-0.3), bottom layers get high anchorY (0.7-0.9)
- Left structures get low anchorX (0.1-0.4), right structures get high anchorX (0.6-0.9)
- Every element must have DIFFERENT coordinates
- Point to the CENTER MASS of each visible structure

Return ONLY the JSON array.`,
          },
        ],
      }],
    });

    const block   = message.content[0];
    const rawText = block?.type === "text" ? block.text.trim() : "[]";

    // Parsear coordenadas devueltas por Claude
    let preciseCoords: Array<{ text: string; anchorX: number; anchorY: number }> = [];
    try {
      const clean = rawText.replace(/```json|```/g, "").trim();
      preciseCoords = JSON.parse(clean);
    } catch {
      console.warn("[analyze/route] Failed to parse Claude response, using original coords");
      preciseCoords = labels.map((l) => ({ text: l.text, anchorX: l.anchorX, anchorY: l.anchorY }));
    }

    // Combinar coordenadas precisas con las descripciones originales
    const preciseLabels: DiagramLabel[] = labels.map((original) => {
      const precise = preciseCoords.find(
        (p) => p.text.toLowerCase().trim() === original.text.toLowerCase().trim()
      );
      return {
        text:        original.text,
        description: original.description,
        anchorX:     precise?.anchorX ?? original.anchorX,
        anchorY:     precise?.anchorY ?? original.anchorY,
      };
    });

    return apiSuccess({ preciseLabels });

  } catch (err) {
    console.error("[analyze/route] Error:", err instanceof Error ? err.message : err);
    return ApiErrors.internal();
  }
}
