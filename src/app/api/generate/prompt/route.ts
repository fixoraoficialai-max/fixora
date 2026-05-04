import { NextRequest } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
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

// ─── Validation schema ────────────────────────────────────────────────────────

/**
 * ~5.5MB in base64 ≈ 4MB raw — matches the client-side MAX_IMAGE_BYTES.
 * Styles and tones are restricted to the shared allowlist — prevents prompt
 * injection via free-text fields. Never accept arbitrary values from the client.
 */
const schema = z.object({
  prompt: z
    .string()
    .min(5,    "Prompt muy corto — escribe al menos 5 caracteres")
    .max(2000, "Prompt muy largo — máximo 2000 caracteres")
    .trim(),
  style:       z.enum(PROMPT_STYLES).optional(),
  tone:        z.enum(PROMPT_TONES).optional(),
  aspectRatio: z.enum(["PORTRAIT", "LANDSCAPE", "SQUARE"]).optional(),
  /** Style card ID from the image page. Validated server-side against the allowlist. */
  styleId:     z.enum([...STYLE_IDS] as [string, ...string[]]).optional(),
  imageBase64: z.string()
    .refine(
      (val) => ACCEPTED_IMAGE_PREFIXES.some((prefix) => val.startsWith(prefix)),
      "Formato de imagen inválido"
    )
    .refine(
      (val) => val.length <= 5_500_000,
      "Imagen demasiado grande — máximo 4MB"
    )
    .optional(),
  imageMediaType: z.enum(ACCEPTED_IMAGE_TYPES).optional(),
});

// ─── Constants ────────────────────────────────────────────────────────────────

const PROMPT_CREDIT_COST = 1;
const MODEL = "claude-haiku-4-5-20251001";

// ─── Anthropic client — singleton, one instance per lambda warm start ─────────

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Builds the context string from validated, allowlisted values only.
 * Never includes raw client input — only enum-validated values.
 */
function buildContext(style?: string, tone?: string, aspectRatio?: string): string {
  const parts = [
    style ? `Estilo: ${style}` : null,
    tone ? `Tono: ${tone}` : null,
    aspectRatio ? `Proporción: ${aspectRatio}` : null,
  ].filter(Boolean);

  return parts.length > 0 ? ` — ${parts.join(", ")}` : "";
}

/**
 * Builds the Claude message content array.
 * When an image is provided, prepends an image block so Claude can analyze it.
 * Single responsibility: content assembly only.
 */
function buildMessageContent(
  prompt: string,
  context: string,
  imageBase64?: string,
  imageMediaType?: AcceptedImageType
): Anthropic.MessageParam["content"] {
  const textBlock: Anthropic.TextBlockParam = {
    type: "text",
    text: `Extract visual intent from this idea: "${prompt}"${context}`,

  };

  if (!imageBase64 || !imageMediaType) return [textBlock];

  // Strip the data URI prefix — Claude expects raw base64 only
  const rawBase64 = imageBase64.split(",")[1];
  if (!rawBase64) return [textBlock]; // malformed data URI — degrade gracefully

  const imageBlock: Anthropic.ImageBlockParam = {
    type: "image",
    source: {
      type: "base64",
      media_type: imageMediaType,
      data: rawBase64,
    },
  };

  return [imageBlock, textBlock];
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
    try {
      body = await req.json();
    } catch {
      return ApiErrors.validation({ message: "Cuerpo JSON inválido" });
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) return ApiErrors.validation(parsed.error.flatten().fieldErrors);

    const { prompt, style, tone, aspectRatio, styleId, imageBase64, imageMediaType } = parsed.data;

    const reserved = await reserveCredits(userId, PROMPT_CREDIT_COST);
    if (!reserved) return ApiErrors.insufficientCredits();

    const context = buildContext(style, tone, aspectRatio);
    const content = buildMessageContent(prompt, context, imageBase64, imageMediaType);

    // ── Layer 1: Claude extracts clean visual intent only ──────────────────────
    const systemPrompt = [
      "You are a visual intent extractor for an AI image generation pipeline.",
      imageBase64
        ? "The user has attached a reference image. Analyze its subject, environment, lighting, and mood to enrich the description."
        : null,
      "Your ONLY task: convert the user's raw idea into a clean, natural 1-2 sentence visual description in English.",
      "Describe the subject, ANY ACTIONS OR MOVEMENT (crucial), setting, lighting, and mood.",
      "CRITICAL: Never drop key verbs (like spilling, jumping, flying). If the user describes a dynamic action, you MUST preserve it accurately.",
      "Do NOT add style, camera specs, quality keywords, or negative prompts — those are handled by a separate backend layer.",
      "Return ONLY the clean description. No explanations, no headers, no formatting.",
      context ? `Context clues (aspect/tone): ${context}` : null,
    ].filter(Boolean).join(" ");


    let message: Awaited<ReturnType<typeof anthropic.messages.create>>;
    try {
      message = await anthropic.messages.create({
        model:      MODEL,
        max_tokens: 200,
        system:     systemPrompt,
        messages:   [{ role: "user", content }],
      });
    } catch (err) {
      await releaseCredits(userId, PROMPT_CREDIT_COST);
      console.error("[prompt/route] Anthropic API error:", err);
      return ApiErrors.internal();
    }

    const block      = message.content[0];
    const cleanIntent = block?.type === "text" ? block.text.trim() : prompt;

    // ── Layer 2: Backend assembler injects Style DNA deterministically ─────────
    const optimized = assemblePrompt(cleanIntent, styleId);

    return apiSuccess({ original: prompt, optimized });

  } catch (err) {
    // Safety net — any unhandled exception (DB down, cold-start crash, etc.)
    // must never return an empty body. Always respond with JSON so the client
    // can parse the error and show a proper message.
    if (userId) await releaseCredits(userId, PROMPT_CREDIT_COST).catch(() => { });
    console.error("[prompt/route] Unhandled error:", err);
    return ApiErrors.internal();
  }
}
