import { fal } from "./index";
import { getFalWebhookUrl } from "./kling";
import { type StudioStyle } from "@/lib/validations/studio";

// ─── Model ────────────────────────────────────────────────────────────────────

export const STUDIO_MODEL = "fal-ai/minimax-video/image-to-video" as const;

// ─── Style descriptors ────────────────────────────────────────────────────────

const STYLE_DESCRIPTORS: Record<StudioStyle, string> = {
  elegant:    "Elegant cinematic style, soft lighting, smooth transitions, premium look.",
  dynamic:    "Energetic camera movement, vibrant and engaging, modern visual style.",
  minimalist: "Clean composition, natural lighting, focused and calm visual storytelling.",
};

// ─── Prompt builder ───────────────────────────────────────────────────────────

/**
 * Builds a scene prompt that combines the user's description with a style directive.
 * Single responsibility: returns a production-ready prompt string.
 */
export function buildScenePrompt(sceneDescription: string, style: StudioStyle): string {
  return [
    sceneDescription.trim(),
    STYLE_DESCRIPTORS[style],
    "Maintain character consistency throughout. High quality, cinematic.",
  ].join(" ");
}

// ─── Job submission ───────────────────────────────────────────────────────────

export type StudioSceneJobInput = {
  characterImageUrl: string;
  sceneDescription:  string;
  style:             StudioStyle;
};

/**
 * Submits a Studio scene generation job to Fal.ai.
 * The character image provides visual consistency across all scenes in the series.
 */
export async function submitStudioSceneJob(input: StudioSceneJobInput) {
  return await fal.queue.submit(STUDIO_MODEL, {
    input: {
      image_url: input.characterImageUrl,
      prompt:    buildScenePrompt(input.sceneDescription, input.style),
    },
    webhookUrl: getFalWebhookUrl(),
  });
}
