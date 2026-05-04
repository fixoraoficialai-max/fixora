import { NextRequest } from "next/server";
import { z } from "zod";
import OpenAI from "openai";
import { auth } from "@/lib/auth/config";
import { ApiErrors, apiSuccess } from "@/lib/api/response";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security";
import { reserveCredits, releaseCredits } from "@/lib/credits";
import {
  PROMPT_STYLES,
  PROMPT_TONES,
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_IMAGE_PREFIXES,
  type AcceptedImageType,
} from "@/lib/prompt-constants";
import { STYLE_IDS, assemblePrompt } from "@/lib/style-dna";
import type { DiagramLabel } from "@/components/DiagramOverlay";

// ─── Constants ────────────────────────────────────────────────────────────────

const PROMPT_CREDIT_COST = 1;
const MODEL              = "gpt-4o-mini";

/** Styles that generate a labeled diagram instead of a plain image */
const DIAGRAM_STYLES = new Set(["corte-transversal", "infografia"]);

// ─── OpenAI client (module-level singleton) ───────────────────────────────────

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Validation schema ────────────────────────────────────────────────────────

const schema = z.object({
  prompt: z
    .string()
    .min(5,    "Prompt muy corto — escribe al menos 5 caracteres")
    .max(2000, "Prompt muy largo — máximo 2000 caracteres")
    .trim(),
  style:          z.enum(PROMPT_STYLES).optional(),
  tone:           z.enum(PROMPT_TONES).optional(),
  aspectRatio:    z.enum(["PORTRAIT", "LANDSCAPE", "SQUARE"]).optional(),
  styleId:        z.enum([...STYLE_IDS] as [string, ...string[]]).optional(),
  imageBase64:    z
    .string()
    .refine(
      (val) => ACCEPTED_IMAGE_PREFIXES.some((prefix) => val.startsWith(prefix)),
      "Formato de imagen inválido"
    )
    .refine((val) => val.length <= 5_500_000, "Imagen demasiado grande — máximo 4MB")
    .optional(),
  imageMediaType: z.enum(ACCEPTED_IMAGE_TYPES).optional(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface DiagramClaudeResponse {
  description: string;
  labels:      DiagramLabel[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildContextString(style?: string, tone?: string, aspectRatio?: string): string {
  return [
    style       ? `Style: ${style}`           : null,
    tone        ? `Tone: ${tone}`             : null,
    aspectRatio ? `Format: ${aspectRatio}`    : null,
  ].filter(Boolean).join(", ");
}

function buildSystemPrompt(hasImage: boolean, styleId?: string, context?: string): string {
  const isDiagram  = styleId ? DIAGRAM_STYLES.has(styleId) : false;
  const imageNote  = hasImage
    ? "The user has attached a reference image. Analyze its subject, composition, and content."
    : null;

  if (isDiagram) {
    return [
      "You are a technical diagram expert for an AI image generation pipeline.",
      imageNote,
      "The user wants a technical diagram or cross-section illustration.",
      "",
      "Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):",
      `{
  "description": "One sentence describing the subject to illustrate in English. No text or labels.",
  "labels": [
    {
      "text": "Label name in Spanish",
      "description": "Short functional description in Spanish (max 8 words)",
      "anchorX": 0.25,
      "anchorY": 0.55
    }
  ]
}`,
      "",
      "Rules for labels:",
      "- Generate 5 to 7 labels for the most important parts.",
      "- anchorX and anchorY are normalized coordinates (0.0 = left/top, 1.0 = right/bottom).",
      "- Estimate realistic positions based on how the subject typically looks in a cross-section.",
      "- Place 2-3 labels on the left side (anchorX < 0.5) and 2-4 on the right (anchorX >= 0.5).",
      "- Avoid placing labels at exactly 0.5 horizontally — they must be clearly left or right.",
      context ? `Context: ${context}` : null,
    ].filter(Boolean).join("\n");
  }

  return [
    "You are a visual intent extractor for a professional AI image generation pipeline.",
    imageNote,
    "Your task: convert the user's raw idea into a rich, vivid visual description in English.",
    "Describe: main subject, action or pose, environment, lighting quality, color palette, camera angle.",
    "Write 2-3 concise sentences. Be specific — avoid vague adjectives like 'beautiful' or 'amazing'.",
    "Do NOT add style names, camera brands, quality keywords (8K, HDR), or negative prompts.",
    "Return ONLY the clean description. No explanations, no headers, no JSON.",
    context ? `Context clues: ${context}` : null,
  ].filter(Boolean).join(" ");
}

function buildMessageContent(
  prompt:          string,
  context:         string,
  imageBase64?:    string,
  imageMediaType?: AcceptedImageType
): string | OpenAI.ChatCompletionContentPart[] {
  const userText = context
    ? `Extract visual intent from: "${prompt}" (Context: ${context})`
    : `Extract visual intent from: "${prompt}"`;

  if (!imageBase64 || !imageMediaType) return userText;

  const rawBase64 = imageBase64.split(",")[1];
  if (!rawBase64) return userText;

  return [
    {
      type:      "image_url" as const,
      image_url: { url: `data:${imageMediaType};base64,${rawBase64}` },
    },
    { type: "text" as const, text: userText },
  ];
}

function parseDiagramResponse(rawText: string): DiagramClaudeResponse | null {
  try {
    const clean  = rawText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean) as DiagramClaudeResponse;

    if (typeof parsed.description !== "string" || !Array.isArray(parsed.labels)) {
      return null;
    }

    const validLabels: DiagramLabel[] = parsed.labels
      .filter(
        (label) =>
          typeof label.text    === "string" &&
          typeof label.anchorX === "number" &&
          typeof label.anchorY === "number" &&
          label.anchorX >= 0 && label.anchorX <= 1 &&
          label.anchorY >= 0 && label.anchorY <= 1
      )
      .map((label) => ({
        text:        label.text,
        description: typeof label.description === "string" ? label.description : undefined,
        anchorX:     Math.round(label.anchorX * 100) / 100,
        anchorY:     Math.round(label.anchorY * 100) / 100,
      }));

    return { description: parsed.description, labels: validLabels };
  } catch {
    return null;
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let userId: string | undefined;

  try {
    const session = await auth();
    if (!session?.user?.id) return ApiErrors.unauthorized();
    userId = session.user.id;

    if (!(await checkRateLimit(`prompt:${userId}`, RATE_LIMITS.prompt))) {
      return ApiErrors.tooManyRequests();
    }

    let body: unknown;
    try { body = await req.json(); }
    catch { return ApiErrors.validation({ message: "Cuerpo JSON inválido" }); }

    const parsed = schema.safeParse(body);
    if (!parsed.success) return ApiErrors.validation(parsed.error.flatten().fieldErrors);

    const { prompt, style, tone, aspectRatio, styleId, imageBase64, imageMediaType } = parsed.data;
    const isDiagram = styleId ? DIAGRAM_STYLES.has(styleId) : false;

    const reserved = await reserveCredits(userId, PROMPT_CREDIT_COST);
    if (!reserved) return ApiErrors.insufficientCredits();

    const context      = buildContextString(style, tone, aspectRatio);
    const systemPrompt = buildSystemPrompt(!!imageBase64, styleId, context);
    const userContent  = buildMessageContent(prompt, context, imageBase64, imageMediaType);

    // ── Stage 1: GPT-4o-mini extracts visual intent (+ labels if diagram) ──────

    let rawText: string;
    try {
      const completion = await openai.chat.completions.create({
        model:      MODEL,
        max_tokens: isDiagram ? 600 : 300,
        messages: [
          { role: "system", content: systemPrompt } as OpenAI.ChatCompletionSystemMessageParam,
          { role: "user",   content: userContent  } as OpenAI.ChatCompletionUserMessageParam,
        ],
      });
      rawText = completion.choices[0]?.message?.content?.trim() ?? prompt;
    } catch (err) {
      await releaseCredits(userId, PROMPT_CREDIT_COST);
      console.error("[prompt/route] OpenAI API error:", err);
      return ApiErrors.internal();
    }

    // ── Stage 2: Parse response depending on mode ─────────────────────────────

    let cleanIntent:  string;
    let diagramLabels: DiagramLabel[] | undefined;

    if (isDiagram) {
      const diagramData = parseDiagramResponse(rawText);
      if (diagramData) {
        cleanIntent   = diagramData.description;
        diagramLabels = diagramData.labels;
      } else {
        console.warn("[prompt/route] Diagram JSON parse failed — using raw text as fallback");
        cleanIntent   = rawText;
        diagramLabels = [];
      }
    } else {
      cleanIntent = rawText;
    }

    // ── Stage 3: Style DNA injects art direction ───────────────────────────────

    const assembled = assemblePrompt(cleanIntent, styleId);

    return apiSuccess({
      original:         prompt,
      cleanIntent,
      optimized:        assembled.prompt,
      negativePrompt:   assembled.negativePrompt,
      needsTextOverlay: assembled.needsTextOverlay,
      styleName:        assembled.styleName,
      ...(diagramLabels !== undefined ? { diagramLabels } : {}),
    });

  } catch (err) {
    if (userId) await releaseCredits(userId, PROMPT_CREDIT_COST).catch(() => null);
    console.error("[prompt/route] Unhandled error:", err);
    return ApiErrors.internal();
  }
}