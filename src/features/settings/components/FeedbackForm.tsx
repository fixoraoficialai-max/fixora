"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactSchema, CONTACT_CATEGORIES, type ContactInput, type ContactCategory } from "@/lib/validations/contact";
import { Textarea, FormField } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

const CATEGORY_ICONS: Record<ContactCategory, string> = {
  sugerencia: "💡",
  reclamo:    "🚨",
  idea:       "✨",
  bug:        "🐛",
};

const MAX_CHARS = 1000;

// ─── Component ───────────────────────────────────────────────────────────────

export function FeedbackForm() {
  const t = useTranslations("settings");
  const [serverError, setServerError]   = useState<string | null>(null);
  const [success, setSuccess]           = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const CATEGORY_OPTIONS: { value: ContactCategory; icon: string; label: string }[] = [
    { value: "sugerencia", icon: CATEGORY_ICONS.sugerencia, label: t("feedbackCategorySugerencia") },
    { value: "reclamo",    icon: CATEGORY_ICONS.reclamo,    label: t("feedbackCategoryReclamo")    },
    { value: "idea",       icon: CATEGORY_ICONS.idea,       label: t("feedbackCategoryIdea")       },
    { value: "bug",        icon: CATEGORY_ICONS.bug,        label: t("feedbackCategoryBug")        },
  ];

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
        setServerError(json.error?.message ?? t("feedbackSendError"));
        return;
      }

      setSuccess(true);
      reset();
      setTimeout(() => setSuccess(false), 5000);
    } catch {
      setServerError(t("feedbackConnectionError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <CheckCircle2 className="h-8 w-8 text-success" />
        <p className="text-sm font-medium text-success">{t("feedbackSuccessMsg")}</p>
        <p className="text-xs text-text-muted">{t("feedbackSuccessDesc")}</p>
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
        label={t("feedbackMessageLabel")}
        required
        error={errors.message?.message}
        hint={`${messageLength} / ${MAX_CHARS}`}
      >
        <Textarea
          placeholder={t("feedbackPlaceholder")}
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
          {isSubmitting ? t("feedbackSending") : t("feedbackSend")}
        </Button>
      </div>
    </form>
  );
}
