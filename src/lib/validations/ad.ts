import { z } from "zod";

/** Validates a publicly-accessible HTTP/HTTPS URL — same constraint as all other submit schemas. */
const publicUrl = z
  .string()
  .url("Must be a valid URL")
  .refine(
    (url) => url.startsWith("https://") || url.startsWith("http://"),
    { message: "Must be a public HTTP/HTTPS URL" }
  );

export const AD_STYLES = ["elegant", "dynamic", "minimalist"] as const;
export type AdStyle = typeof AD_STYLES[number];

export const adSubmitSchema = z.object({
  characterImageUrl: publicUrl,
  productImageUrl:   publicUrl,
  productName:       z.string().min(2, "El nombre del producto es requerido").max(100).trim(),
  style:             z.enum(AD_STYLES, { message: "Estilo inválido" }),
});

export const adStatusSchema = z.object({
  jobId:     z.string().cuid("Invalid job ID"),
  requestId: z.string().min(1, "Request ID is required"),
});

export type AdSubmitInput = z.infer<typeof adSubmitSchema>;
export type AdStatusInput = z.infer<typeof adStatusSchema>;
