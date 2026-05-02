import { z } from "zod";

export const CONTACT_CATEGORIES = ["sugerencia", "reclamo", "idea", "bug"] as const;
export type ContactCategory = (typeof CONTACT_CATEGORIES)[number];

export const contactSchema = z.object({
  category: z.enum(CONTACT_CATEGORIES, {
    required_error: "Selecciona una categoría",
    invalid_type_error: "Categoría no válida",
  }),
  message: z
    .string({ required_error: "El mensaje es requerido" })
    .min(20, "El mensaje debe tener al menos 20 caracteres")
    .max(1000, "El mensaje no puede superar los 1000 caracteres")
    .trim(),
});

export type ContactInput = z.infer<typeof contactSchema>;
