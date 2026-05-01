"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validations/auth";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: token ?? "",
    },
  });

  if (!token) {
    return (
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold text-text-primary mb-2">Invalid Link</h1>
        <p className="text-sm text-text-muted mb-8">
          This password reset link is invalid or missing the required token. Please request a new one.
        </p>
        <Button variant="primary" className="w-full" asChild>
          <Link href="/forgot-password">Request new link</Link>
        </Button>
      </div>
    );
  }

  const onSubmit = async (data: ResetPasswordInput) => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setServerError(result.error || "An unexpected error occurred. Please try again.");
        return;
      }

      setIsSuccess(true);
    } catch (err) {
      console.error(err);
      setServerError("Network error. Please try again later.");
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
        <h1 className="text-2xl font-bold text-text-primary mb-2">Password reset</h1>
        <p className="text-sm text-text-muted mb-8">
          Your password has been successfully reset. You can now sign in with your new password.
        </p>
        <Button variant="primary" className="w-full" asChild>
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-text-primary">Set new password</h1>
        <p className="mt-2 text-sm text-text-muted">Enter your new password below</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        {serverError && (
          <div role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {serverError}
          </div>
        )}

        <input type="hidden" {...register("token")} />

        <FormField label="New Password" error={errors.password?.message} required>
          <Input
            type="password"
            placeholder="At least 8 characters"
            icon={<Lock className="h-4 w-4" />}
            disabled={isSubmitting}
            {...register("password")}
            error={errors.password?.message}
          />
        </FormField>

        <FormField label="Confirm Password" error={errors.confirmPassword?.message} required>
          <Input
            type="password"
            placeholder="Repeat new password"
            icon={<Lock className="h-4 w-4" />}
            disabled={isSubmitting}
            {...register("confirmPassword")}
            error={errors.confirmPassword?.message}
          />
        </FormField>

        <Button type="submit" variant="primary" className="mt-2 w-full" disabled={isSubmitting}>
          {isSubmitting ? "Resetting..." : "Reset password"}
        </Button>
      </form>
    </div>
  );
}
