import { z } from "zod";
import { ADMIN_PIN_CONFIG } from "@/lib/security/admin-pin";

export const adminPinSchema = z.object({
  pin: z
    .string({ required_error: "PIN requerido" })
    .min(ADMIN_PIN_CONFIG.minLength, `El PIN debe tener al menos ${ADMIN_PIN_CONFIG.minLength} caracteres`)
    .max(ADMIN_PIN_CONFIG.maxLength, `El PIN no puede superar los ${ADMIN_PIN_CONFIG.maxLength} caracteres`),
  recaptchaToken: z.string().optional(),
});

export type AdminPinInput = z.infer<typeof adminPinSchema>;
