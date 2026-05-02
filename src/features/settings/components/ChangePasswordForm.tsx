"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/validations/user";
import { Input, FormField } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, CheckCircle2 } from "lucide-react";

interface ChangePasswordFormProps {
  hasPassword: boolean;
}

export function ChangePasswordForm({ hasPassword }: ChangePasswordFormProps) {
  const t = useTranslations("settings");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  });

  if (!hasPassword) {
    return (
      <div className="mt-4 rounded-lg border border-dashed border-border bg-surface-elevated/50 p-4 text-sm text-text-muted text-center">
        {t("googleAccount")}
      </div>
    );
  }

  const onSubmit = async (data: ChangePasswordInput) => {
    setIsSubmitting(true);
    setServerError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/user/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setServerError(result.error || t("networkError"));
        return;
      }

      setSuccessMessage(t("passwordChanged"));
      reset();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      console.error(err);
      setServerError(t("networkError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4 mt-4 p-4 border border-border rounded-lg bg-surface/50">
      <h3 className="text-sm font-medium text-text-primary mb-2">{t("changePassword")}</h3>

      {serverError && (
        <div role="alert" className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          {serverError}
        </div>
      )}

      {successMessage && (
        <div role="alert" className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-xs text-success flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          {successMessage}
        </div>
      )}

      <FormField label={t("currentPassword")} error={errors.currentPassword?.message} required>
        <Input
          type="password"
          placeholder={t("currentPasswordPlaceholder")}
          icon={<Lock className="h-4 w-4" />}
          disabled={isSubmitting}
          {...register("currentPassword")}
          error={errors.currentPassword?.message}
        />
      </FormField>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label={t("newPassword")} error={errors.newPassword?.message} required>
          <Input
            type="password"
            placeholder={t("newPasswordPlaceholder")}
            icon={<Lock className="h-4 w-4" />}
            disabled={isSubmitting}
            {...register("newPassword")}
            error={errors.newPassword?.message}
          />
        </FormField>

        <FormField label={t("confirmNewPassword")} error={errors.confirmNewPassword?.message} required>
          <Input
            type="password"
            placeholder={t("confirmNewPasswordPlaceholder")}
            icon={<Lock className="h-4 w-4" />}
            disabled={isSubmitting}
            {...register("confirmNewPassword")}
            error={errors.confirmNewPassword?.message}
          />
        </FormField>
      </div>

      <div className="flex justify-end mt-2">
        <Button type="submit" variant="primary" disabled={!isDirty || isSubmitting}>
          {isSubmitting ? t("changing") : t("changePasswordBtn")}
        </Button>
      </div>
    </form>
  );
}
