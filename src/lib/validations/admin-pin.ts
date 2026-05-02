import { z } from "zod";
import { ADMIN_PIN_CONFIG } from "@/lib/security/admin-pin";

export const adminPinSchema = z.object({
  pin: z
    .string({ required_error: "PIN requerido" })
    .regex(/^\d+$/, "El PIN solo puede contener dígitos")
    .min(ADMIN_PIN_CONFIG.minLength, `El PIN debe tener entre ${ADMIN_PIN_CONFIG.minLength} y ${ADMIN_PIN_CONFIG.maxLength} dígitos`)
    .max(ADMIN_PIN_CONFIG.maxLength, `El PIN debe tener entre ${ADMIN_PIN_CONFIG.minLength} y ${ADMIN_PIN_CONFIG.maxLength} dígitos`),
  recaptchaToken: z.string().optional(),
});

export type AdminPinInput = z.infer<typeof adminPinSchema>;
