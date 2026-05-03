import { NextRequest } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth/config";
import { ApiErrors, apiSuccess } from "@/lib/api/response";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security";
import {
  PROMPT_STYLES,
  PROMPT_TONES,
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_IMAGE_PREFIXES,
  type AcceptedImageType,
} from "@/lib/prompt-constants";

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
  style:         z.enum(PROMPT_STYLES).optional(),
  tone:          z.enum(PROMPT_TONES).optional(),
  aspectRatio:   z.enum(["PORTRAIT", "LANDSCAPE", "SQUARE"]).optional(),
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

// ─── Anthropic client — singleton, one instance per lambda warm start ─────────

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Builds the context string from validated, allowlisted values only.
 * Never includes raw client input — only enum-validated values.
 */
function buildContext(style?: string, tone?: string, aspectRatio?: string): string {
  const parts = [
    style       ? `Estilo: ${style}`           : null,
    tone        ? `Tono: ${tone}`              : null,
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
    text: `Optimize this prompt: "${prompt}"${context}`,
  };

  if (!imageBase64 || !imageMediaType) return [textBlock];

  // Strip the data URI prefix — Claude expects raw base64 only
  const rawBase64 = imageBase64.split(",")[1];
  if (!rawBase64) return [textBlock]; // malformed data URI — degrade gracefully

  const imageBlock: Anthropic.ImageBlockParam = {
    type:   "image",
    source: {
      type:       "base64",
      media_type: imageMediaType,
      data:       rawBase64,
    },
  };

  return [imageBlock, textBlock];
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();

  // 5 optimizations per minute per user — isolated from video generation quota
  if (!checkRateLimit(`prompt:${session.user.id}`, RATE_LIMITS.generate)) {
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

  const { prompt, style, tone, aspectRatio, imageBase64, imageMediaType } = parsed.data;

  const context = buildContext(style, tone, aspectRatio);
  const content = buildMessageContent(prompt, context, imageBase64, imageMediaType);

  const systemPrompt = [
    "You are an expert AI video and image prompt engineer.",
    imageBase64
      ? "The user has provided a reference image. Analyze its visual style, composition, colors, lighting, and mood. Use these visual elements to make the prompt more precise and aligned with what the user wants."
      : null,
    "Transform the user's idea into a detailed cinematic prompt optimized for FLUX and Kling AI.",
    "Write the prompt in English. Include: lighting style, composition, camera angle, atmosphere, and lens type.",
    "Keep the result under 200 words.",
    "Return ONLY the optimized prompt — no explanations, no headers, no formatting.",
  ].filter(Boolean).join(" ");

  let message: Awaited<ReturnType<typeof anthropic.messages.create>>;
  try {
    message = await anthropic.messages.create({
      model:      "claude-3-5-haiku-20241022",
      max_tokens: 300,
      system:     systemPrompt,
      messages:   [{ role: "user", content }],
    });
  } catch (err) {
    console.error("[prompt/route] Anthropic API error:", err);
    return ApiErrors.internal();
  }

  const block     = message.content[0];
  const optimized = block?.type === "text" ? block.text.trim() : prompt;

  return apiSuccess({ original: prompt, optimized });
}
