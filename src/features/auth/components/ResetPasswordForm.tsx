"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validations/auth";
import { Input, FormField } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { Lock, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token        = searchParams.get("token");
  const t            = useTranslations("auth");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError]   = useState<string | null>(null);
  const [isSuccess, setIsSuccess]       = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver:      zodResolver(resetPasswordSchema),
    defaultValues: { token: token ?? "" },
  });

  // Invalid or missing token — show error state immediately
  if (!token) {
    return (
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold text-text-primary mb-2">{t("invalidLinkTitle")}</h1>
        <p className="text-sm text-text-muted mb-8">{t("invalidLinkDesc")}</p>
        <Button variant="primary" className="w-full" asChild>
          <Link href="/forgot-password">{t("requestNewLink")}</Link>
        </Button>
      </div>
    );
  }

  const onSubmit = async (data: ResetPasswordInput) => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      const response = await fetch("/api/auth/reset-password", {
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
        <h1 className="text-2xl font-bold text-text-primary mb-2">{t("passwordResetTitle")}</h1>
        <p className="text-sm text-text-muted mb-8">{t("passwordResetDesc")}</p>
        <Button variant="primary" className="w-full" asChild>
          <Link href="/login">{t("signIn")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-text-primary">{t("setNewPasswordTitle")}</h1>
        <p className="mt-2 text-sm text-text-muted">{t("setNewPasswordSubtitle")}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        {serverError && <FormAlert variant="error" size="md">{serverError}</FormAlert>}

        <input type="hidden" {...register("token")} />

        <FormField label={t("newPassword")} error={errors.password?.message} required>
          <Input
            type="password"
            placeholder={t("newPasswordMin")}
            icon={<Lock className="h-4 w-4" />}
            disabled={isSubmitting}
            {...register("password")}
            error={errors.password?.message}
          />
        </FormField>

        <FormField label={t("confirmPassword")} error={errors.confirmPassword?.message} required>
          <Input
            type="password"
            placeholder={t("repeatNewPassword")}
            icon={<Lock className="h-4 w-4" />}
            disabled={isSubmitting}
            {...register("confirmPassword")}
            error={errors.confirmPassword?.message}
          />
        </FormField>

        <Button type="submit" variant="primary" className="mt-2 w-full" disabled={isSubmitting}>
          {isSubmitting ? t("resetting") : t("resetPasswordBtn")}
        </Button>
      </form>
    </div>
  );
}
