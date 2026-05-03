"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations/auth";
import { Input, FormField } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError]   = useState<string | null>(null);
  const [isSuccess, setIsSuccess]       = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setServerError(result.error || t("unexpectedError"));
        return;
      }

      setIsSuccess(true);
    } catch {
      setServerError(t("networkError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-text-primary mb-2">{t("checkEmailTitle")}</h1>
        <p className="text-sm text-text-muted mb-8">{t("checkEmailDesc")}</p>
        <Button variant="outline" className="w-full" asChild>
          <Link href="/login">{t("returnToLogin")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-text-primary">{t("forgotTitle")}</h1>
        <p className="mt-2 text-sm text-text-muted">{t("forgotSubtitle")}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        {serverError && (
          <div role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {serverError}
          </div>
        )}

        <FormField label={t("email")} error={errors.email?.message} required>
          <Input
            type="email"
            placeholder={t("emailPlaceholder")}
            icon={<Mail className="h-4 w-4" />}
            autoComplete="email"
            autoFocus
            disabled={isSubmitting}
            {...register("email")}
            error={errors.email?.message}
          />
        </FormField>

        <Button type="submit" variant="primary" className="mt-2 w-full" disabled={isSubmitting}>
          {isSubmitting ? t("sending") : t("sendResetLink")}
        </Button>

        <div className="mt-4 text-center text-sm">
          <Link href="/login" className="text-text-muted hover:text-text-primary transition-colors">
            {t("backToLogin")}
          </Link>
        </div>
      </form>
    </div>
  );
}
