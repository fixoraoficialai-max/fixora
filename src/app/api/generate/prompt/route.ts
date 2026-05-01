import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { ApiErrors, apiSuccess } from "@/lib/api/response";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security";
import Anthropic from "@anthropic-ai/sdk";

// ─── Constants ────────────────────────────────────────────────────────────────

// Allowlisted style values — prevents prompt injection via the style/tone fields
const ALLOWED_STYLES = [
  "Pixar 3D character style",
  "Anime character style",
  "Realistic human",
  "Cartoon character",
  "Fantasy creature",
  "Robot/Cyborg",
] as const;

const ALLOWED_TONES = [
  "motivational",
  "sad",
  "happy",
  "epic",
  "funny",
  "dramatic",
] as const;

// ─── Validation ───────────────────────────────────────────────────────────────

const schema = z.object({
  prompt:      z.string().min(5, "Prompt too short").max(2000, "Prompt too long").trim(),
  // style and tone are restricted to known safe values — no free-text injection
  style:       z.enum(ALLOWED_STYLES).optional(),
  tone:        z.enum(ALLOWED_TONES).optional(),
  aspectRatio: z.enum(["PORTRAIT", "LANDSCAPE", "SQUARE"]).optional(),
});

// ─── Singleton — initialized once at module level, not per request ─────────────
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();

  // ── Rate limit: 5 calls/min per user (same tier as video generation) ──────
  if (!checkRateLimit(`generate:${session.user.id}`, RATE_LIMITS.generate)) {
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

  const { prompt, style, tone, aspectRatio } = parsed.data;

  // Build the context string from validated, allowlisted values only
  const context = [
    style       ? `Style: ${style}`         : null,
    tone        ? `Tone: ${tone}`           : null,
    aspectRatio ? `Ratio: ${aspectRatio}`   : null,
  ].filter(Boolean).join(", ");

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 300,
    system: [
      "You are an expert AI image prompt engineer.",
      "Transform simple descriptions into detailed cinematic prompts optimized for FLUX and Kling AI.",
      "Write in English. Include: lighting style, composition, camera angle, atmosphere, lens type.",
      "Keep under 200 words. Return ONLY the optimized prompt — no explanations, no formatting.",
    ].join(" "),
    messages: [{
      role: "user",
      content: `Optimize this prompt: "${prompt}"${context ? ` — ${context}` : ""}`,
    }],
  });

  const block = message.content[0];
  const optimized = block?.type === "text" ? block.text.trim() : prompt;

  return apiSuccess({ original: prompt, optimized });
}
