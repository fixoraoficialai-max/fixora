/**
 * Shared constants for the prompt optimization feature.
 *
 * Single source of truth for styles, tones, and image validation.
 * Both the UI (page.tsx) and the API route (route.ts) import from here.
 * This prevents silent validation failures caused by value drift between layers.
 */

export const PROMPT_STYLES = [
  "Realista",
  "Cinematic",
  "Documentary",
  "Anime",
  "Pixar 3D",
  "Dark & Moody",
  "Bright & Clean",
  "Futuristic",
  "Retro",
] as const;

export const PROMPT_TONES = [
  "Professional",
  "Inspirational",
  "Energetic",
  "Calm",
  "Playful",
  "Urgent",
] as const;

/** Image types supported by Claude's vision API */
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

/** 4 MB in bytes — enforced on both client and server */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/**
 * Base64 data-URI prefixes for each accepted image type.
 * Used on the server to validate that the base64 string is a real image.
 */
export const ACCEPTED_IMAGE_PREFIXES = ACCEPTED_IMAGE_TYPES.map(
  (t) => `data:${t};base64,`
);

export type PromptStyle      = (typeof PROMPT_STYLES)[number];
export type PromptTone       = (typeof PROMPT_TONES)[number];
export type AcceptedImageType = (typeof ACCEPTED_IMAGE_TYPES)[number];
