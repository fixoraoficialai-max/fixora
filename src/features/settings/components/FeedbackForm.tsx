"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactSchema, CONTACT_CATEGORIES, type ContactInput, type ContactCategory } from "@/lib/validations/contact";
import { Textarea, FormField } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Send } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Category config (label + icon) ─────────────────────────────────────────

const CATEGORY_OPTIONS: { value: ContactCategory; icon: string; label: string }[] = [
  { value: "sugerencia", icon: "💡", label: "Sugerencia" },
  { value: "reclamo",    icon: "🚨", label: "Reclamo"    },
  { value: "idea",       icon: "✨", label: "Idea"       },
  { value: "bug",        icon: "🐛", label: "Bug"        },
];

const MAX_CHARS = 1000;

// ─── Component ───────────────────────────────────────────────────────────────

export function FeedbackForm() {
  const [serverError, setServerError]   = useState<string | null>(null);
  const [success, setSuccess]           = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { category: "sugerencia", message: "" },
  });

  const selectedCategory = watch("category");
  const messageLength    = watch("message")?.length ?? 0;

  async function onSubmit(data: ContactInput) {
    setIsSubmitting(true);
    setServerError(null);

    try {
      const res  = await fetch("/api/contact", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data),
      });
      const json = await res.json() as { success: boolean; error?: { message?: string } };

      if (!res.ok || !json.success) {
        setServerError(json.error?.message ?? "No se pudo enviar el mensaje. Inténtalo de nuevo.");
        return;
      }

      setSuccess(true);
      reset();
      setTimeout(() => setSuccess(false), 5000);
    } catch {
      setServerError("Error de conexión. Verifica tu internet e inténtalo de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <CheckCircle2 className="h-8 w-8 text-success" />
        <p className="text-sm font-medium text-success">¡Mensaje enviado!</p>
        <p className="text-xs text-text-muted">Te responderemos al email de tu cuenta.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4 mt-1">

      {/* Category selector */}
      <div className="flex flex-wrap gap-2">
        {CATEGORY_OPTIONS.map(({ value, icon, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setValue("category", value, { shouldValidate: true })}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all",
              selectedCategory === value
                ? "border-primary/40 bg-primary/15 text-primary-light"
                : "border-border text-text-muted hover:border-border-strong hover:text-text-secondary"
            )}
          >
            <span>{icon}</span>
            {label}
          </button>
        ))}
      </div>
      {errors.category && (
        <p className="text-xs text-danger" role="alert">{errors.category.message}</p>
      )}

      {/* Message */}
      <FormField
        label="Mensaje"
        required
        error={errors.message?.message}
        hint={`${messageLength} / ${MAX_CHARS} caracteres`}
      >
        <Textarea
          placeholder="Cuéntanos tu sugerencia, reclamo o idea con detalle..."
          rows={4}
          disabled={isSubmitting}
          {...register("message")}
        />
      </FormField>

      {/* Server error */}
      {serverError && (
        <div role="alert" className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          {serverError}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" variant="primary" disabled={isSubmitting} isLoading={isSubmitting}>
          <Send className="h-4 w-4" />
          {isSubmitting ? "Enviando..." : "Enviar mensaje"}
        </Button>
      </div>
    </form>
  );
}
