/**
 * Shared constants for the prompt optimization feature.
 *
 * Single source of truth for styles and tones.
 * Both the UI (page.tsx) and the API route (route.ts) import from here.
 * This prevents silent validation failures caused by value drift between layers.
 */

export const PROMPT_STYLES = [
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

export type PromptStyle = (typeof PROMPT_STYLES)[number];
export type PromptTone  = (typeof PROMPT_TONES)[number];
