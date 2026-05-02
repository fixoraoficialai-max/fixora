"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateProfileSchema, type UpdateProfileInput } from "@/lib/validations/user";
import { Input, FormField } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { User, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface ProfileEditFormProps {
  initialName: string;
}

export function ProfileEditForm({ initialName }: ProfileEditFormProps) {
  const router        = useRouter();
  const t             = useTranslations("settings");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: initialName,
    },
  });

  const onSubmit = async (data: UpdateProfileInput) => {
    if (!isDirty) return; // Don't submit if nothing changed

    setIsSubmitting(true);
    setServerError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setServerError(result.error || "Failed to update profile.");
        return;
      }

      setSuccessMessage(t("profileUpdated"));
      router.refresh(); // Refresh to get the new name from the server in the UI
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setServerError(t("networkError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4 mt-4 p-4 border border-border rounded-lg bg-surface/50">
      <h3 className="text-sm font-medium text-text-primary mb-2">{t("editProfile")}</h3>
      
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

      <FormField label={t("fullName")} error={errors.name?.message} required>
        <Input
          type="text"
          placeholder={t("yourName")}
          icon={<User className="h-4 w-4" />}
          disabled={isSubmitting}
          {...register("name")}
          error={errors.name?.message}
        />
      </FormField>

      <div className="flex justify-end mt-2">
        <Button type="submit" variant="primary" disabled={!isDirty || isSubmitting}>
          {isSubmitting ? t("saving") : t("saveChanges")}
        </Button>
      </div>
    </form>
  );
}
