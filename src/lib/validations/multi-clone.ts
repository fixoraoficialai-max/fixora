import { z } from "zod";

export const multiCloneSubmitSchema = z.object({
  characterImageUrls: z.array(z.string().url()).length(4, "Se requieren exactamente 4 imágenes"),
  motionVideoUrl: z.string().url("URL de video inválida"),
  prompt: z.string().min(5, "El prompt debe tener al menos 5 caracteres").max(500),
});

export const multiCloneStatusSchema = z.object({
  jobId: z.string().uuid(),
  requestId: z.string().min(1),
});
