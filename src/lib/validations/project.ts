import { z } from "zod";
import { AspectRatio, ProjectStatus } from "@prisma/client";

export const createProjectSchema = z.object({
  name: z
    .string({ required_error: "Project name is required" })
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be 100 characters or less")
    .trim(),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .trim()
    .optional(),
  aspectRatio: z.nativeEnum(AspectRatio).default(AspectRatio.LANDSCAPE),
  platform: z.string().max(50).optional(),
});

export const updateProjectSchema = createProjectSchema.partial().extend({
  status: z.nativeEnum(ProjectStatus).optional(),
});

export const createSceneSchema = z.object({
  order: z.number().int().min(0),
  prompt: z
    .string({ required_error: "Prompt is required" })
    .min(10, "Prompt must be at least 10 characters")
    .max(2000, "Prompt must be 2000 characters or less")
    .trim(),
  visualStyle: z.string().max(100).optional(),
  tone: z.string().max(100).optional(),
  duration: z.number().int().min(1).max(60).default(5),
  narration: z.string().max(1000).optional(),
  notes: z.string().max(500).optional(),
});

export const updateSceneSchema = createSceneSchema.partial();

export const bulkUpdateScenesSchema = z.object({
  scenes: z.array(
    z.object({
      id: z.string().cuid(),
      order: z.number().int().min(0),
    })
  ),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateSceneInput = z.infer<typeof createSceneSchema>;
export type UpdateSceneInput = z.infer<typeof updateSceneSchema>;
