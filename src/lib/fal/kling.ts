import { fal } from "./index";

export const KLING_MODELS = {
  MOTION_CONTROL: "fal-ai/kling-video/v2.6/standard/motion-control",
} as const;

export type KlingMotionInput = {
  image_url: string;
  video_url: string;
  prompt: string;
  character_orientation?: "video" | "image";
};

/**
 * Builds a secure webhook URL for Fal.ai callbacks.
 * No secrets in query strings — security is handled via x-fal-signature header.
 */
export function getFalWebhookUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    // In production this must be set. In dev, webhooks won't work unless using a tunnel like ngrok.
    return "";
  }
  return `${appUrl}/api/webhooks/fal`;
}

/**
 * Submits a single motion control job to Fal.ai queue.
 */
export async function submitKlingMotionJob(input: KlingMotionInput) {
  return await fal.queue.submit(KLING_MODELS.MOTION_CONTROL, {
    input: {
      ...input,
      character_orientation: input.character_orientation ?? "video",
    },
    webhookUrl: getFalWebhookUrl(),
  });
}
