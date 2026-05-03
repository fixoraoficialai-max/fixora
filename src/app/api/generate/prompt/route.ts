import { NextRequest } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth/config";
import { ApiErrors, apiSuccess } from "@/lib/api/response";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security";
import { PROMPT_STYLES, PROMPT_TONES } from "@/lib/prompt-constants";

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Styles and tones are restricted to the shared allowlist — prevents prompt
 * injection via the style/tone fields. Never accept free-text from the client.
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
});

// ─── Anthropic client — singleton, initialized once per lambda warm start ─────

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();

  // 5 optimizations per minute per user
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

  const { prompt, style, tone, aspectRatio } = parsed.data;

  // Build context string from validated, allowlisted values only — never raw client input
  const contextParts = [
    style       ? `Estilo: ${style}`         : null,
    tone        ? `Tono: ${tone}`            : null,
    aspectRatio ? `Proporción: ${aspectRatio}` : null,
  ].filter(Boolean);

  const context = contextParts.length > 0 ? ` — ${contextParts.join(", ")}` : "";

  const message = await anthropic.messages.create({
    model:      "claude-3-5-haiku-20241022",
    max_tokens: 300,
    system: [
      "You are an expert AI video and image prompt engineer.",
      "Transform simple descriptions into detailed cinematic prompts optimized for FLUX and Kling AI.",
      "Write the prompt in English. Include: lighting style, composition, camera angle, atmosphere, and lens type.",
      "Keep the result under 200 words.",
      "Return ONLY the optimized prompt — no explanations, no headers, no formatting.",
    ].join(" "),
    messages: [{
      role:    "user",
      content: `Optimize this prompt: "${prompt}"${context}`,
    }],
  });

  const block     = message.content[0];
  const optimized = block?.type === "text" ? block.text.trim() : prompt;

  return apiSuccess({ original: prompt, optimized });
}
