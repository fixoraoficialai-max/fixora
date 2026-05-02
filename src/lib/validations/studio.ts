import { z } from "zod";

/** Same URL constraint used across all generation schemas. */
const publicUrl = z
  .string()
  .url("Must be a valid URL")
  .refine(
    (url) => url.startsWith("https://") || url.startsWith("http://"),
    { message: "Must be a public HTTP/HTTPS URL" }
  );

export const STUDIO_STYLES = ["elegant", "dynamic", "minimalist"] as const;
export type StudioStyle = typeof STUDIO_STYLES[number];

// ─── Project ──────────────────────────────────────────────────────────────────

export const createStudioProjectSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100)
    .trim(),
  characterImageUrl:  publicUrl,
  storyDescription:   z.string().max(500).trim().optional(),
});

// ─── Scene ────────────────────────────────────────────────────────────────────

export const addStudioSceneSchema = z.object({
  projectId: z.string().cuid("Invalid project ID"),
  prompt:    z
    .string()
    .min(5, "Describe la escena (mínimo 5 caracteres)")
    .max(1000)
    .trim(),
  order: z.number().int().min(0),
});

export const deleteStudioSceneSchema = z.object({
  sceneId: z.string().cuid("Invalid scene ID"),
});

// ─── Generation ───────────────────────────────────────────────────────────────

export const generateStudioSceneSchema = z.object({
  projectId: z.string().cuid("Invalid project ID"),
  sceneId:   z.string().cuid("Invalid scene ID"),
  style:     z.enum(STUDIO_STYLES, { message: "Estilo inválido" }),
});

export const studioStatusSchema = z.object({
  jobId:     z.string().cuid("Invalid job ID"),
  requestId: z.string().min(1, "Request ID is required"),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type CreateStudioProjectInput = z.infer<typeof createStudioProjectSchema>;
export type AddStudioSceneInput      = z.infer<typeof addStudioSceneSchema>;
export type GenerateStudioSceneInput = z.infer<typeof generateStudioSceneSchema>;
export type StudioStatusInput        = z.infer<typeof studioStatusSchema>;
