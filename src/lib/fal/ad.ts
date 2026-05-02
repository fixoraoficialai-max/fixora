import { fal } from "./index";
import { getFalWebhookUrl } from "./kling";
import { type AdStyle } from "@/lib/validations/ad";

// ─── Model ────────────────────────────────────────────────────────────────────

export const AD_MODEL = "fal-ai/minimax-video/image-to-video" as const;

// ─── Style prompts ────────────────────────────────────────────────────────────

const STYLE_DESCRIPTORS: Record<AdStyle, string> = {
  elegant:    "Elegant and luxurious aesthetic, premium brand feel, sophisticated lighting, smooth cinematic movement, high-end commercial quality.",
  dynamic:    "Energetic and fast-paced, vibrant colors, modern advertising style, bold and engaging, youthful commercial energy.",
  minimalist: "Clean minimalist look, professional studio lighting, product-focused composition, crisp and polished commercial style.",
};

// ─── Prompt builder ───────────────────────────────────────────────────────────

/**
 * Generates a professional advertising prompt.
 * Single responsibility: maps (productName, style) → advertising prompt string.
 */
export function buildAdPrompt(productName: string, style: AdStyle): string {
  return [
    `Professional advertising video. A person is confidently showcasing and promoting "${productName}" directly to camera.`,
    `The person holds the product up, presents it with enthusiasm, and makes eye contact with the viewer.`,
    STYLE_DESCRIPTORS[style],
    "Cinematic quality, 4K resolution, commercial grade production.",
  ].join(" ");
}

// ─── Job submission ───────────────────────────────────────────────────────────

export type AdJobInput = {
  characterImageUrl: string;
  productName:       string;
  style:             AdStyle;
};

/**
 * Submits a single Ad Creator job to Fal.ai queue.
 * Character image provides the visual reference; product is described in the prompt.
 */
export async function submitAdJob(input: AdJobInput) {
  return await fal.queue.submit(AD_MODEL, {
    input: {
      image_url: input.characterImageUrl,
      prompt:    buildAdPrompt(input.productName, input.style),
    },
    webhookUrl: getFalWebhookUrl(),
  });
}
