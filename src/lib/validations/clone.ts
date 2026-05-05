import { z } from "zod";

/** Validates that a string is a proper public HTTP/HTTPS URL (not a data URI or local path). */
const publicUrl = z.string().url().refine(
  (url) => url.startsWith("https://") || url.startsWith("http://"),
  { message: "Must be a public HTTP/HTTPS URL" }
);

export const cloneSubmitSchema = z.object({
  characterImageUrl: publicUrl,
  motionVideoUrl: publicUrl,
  prompt: z
    .string()
    .min(5, "Prompt must be at least 5 characters")
    .max(1000, "Prompt must be 1000 characters or less")
    .trim(),
  aspectRatio: z.enum(["9:16", "16:9", "1:1"]).default("9:16"),
});

export const cloneStatusSchema = z.object({
  jobId: z.string().cuid("Invalid job ID"),
  requestId: z.string().min(1, "Request ID is required"),
});

export type CloneSubmitInput = z.infer<typeof cloneSubmitSchema>;
export type CloneStatusInput = z.infer<typeof cloneStatusSchema>;
