"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { User, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input, FormField } from "@/components/ui/input";
import { FormAlert } from "@/components/ui/form-alert";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";

// ─── Eye toggle helper ────────────────────────────────────────────────────────

function EyeToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="text-text-muted hover:text-text-primary transition-colors"
      tabIndex={-1}
    >
      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RegisterForm() {
  const router              = useRouter();
  const t                   = useTranslations("auth");
  const [serverError, setServerError]           = useState<string | null>(null);
  const [showPassword, setShowPassword]         = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(data: RegisterInput) {
    setServerError(null);

    const response = await fetch("/api/auth/register", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name: data.name, email: data.email, password: data.password }),
    });

    const result = await response.json() as { success: boolean; error?: { message: string } };

    if (!result.success) {
      setServerError(result.error?.message ?? t("registrationFailed"));
      return;
    }

    const signInResult = await signIn("credentials", {
      email:    data.email,
      password: data.password,
      redirect: false,
    });

    if (signInResult?.error) {
      router.push("/login");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-text-primary">{t("registerTitle")}</h1>
        <p className="mt-2 text-sm text-text-muted">{t("registerSubtitle")}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        {serverError && <FormAlert variant="error" size="md">{serverError}</FormAlert>}

        <FormField label={t("fullName")} error={errors.name?.message} required>
          <Input
            type="text"
            placeholder={t("fullNamePlaceholder")}
            icon={<User className="h-4 w-4" />}
            autoComplete="name"
            autoFocus
            {...register("name")}
            error={errors.name?.message}
          />
        </FormField>

        <FormField label={t("email")} error={errors.email?.message} required>
          <Input
            type="email"
            placeholder={t("emailPlaceholder")}
            icon={<Mail className="h-4 w-4" />}
            autoComplete="email"
            {...register("email")}
            error={errors.email?.message}
          />
        </FormField>

        <FormField
          label={t("password")}
          error={errors.password?.message}
          hint={t("passwordHint")}
          required
        >
          <Input
            type={showPassword ? "text" : "password"}
            placeholder={t("createPasswordPlaceholder")}
            icon={<Lock className="h-4 w-4" />}
            rightElement={
              <EyeToggle show={showPassword} onToggle={() => setShowPassword((v) => !v)} />
            }
            autoComplete="new-password"
            {...register("password")}
            error={errors.password?.message}
          />
        </FormField>

        <FormField label={t("confirmPassword")} error={errors.confirmPassword?.message} required>
          <Input
            type={showConfirmPassword ? "text" : "password"}
            placeholder={t("repeatPasswordPlaceholder")}
            icon={<Lock className="h-4 w-4" />}
            rightElement={
              <EyeToggle show={showConfirmPassword} onToggle={() => setShowConfirmPassword((v) => !v)} />
            }
            autoComplete="new-password"
            {...register("confirmPassword")}
            error={errors.confirmPassword?.message}
          />
        </FormField>

        <Button type="submit" isLoading={isSubmitting} className="w-full mt-1">
          {isSubmitting ? t("creatingAccount") : t("createAccount")}
        </Button>

        <p className="text-center text-xs text-text-muted">
          {t("termsAgreement")}{" "}
          <Link href="/terms" className="underline hover:text-text-secondary">
            {t("termsOfService")}
          </Link>{" "}
          {t("and")}{" "}
          <Link href="/privacy" className="underline hover:text-text-secondary">
            {t("privacyPolicy")}
          </Link>
          {t("alreadyHaveAccountDot")}
        </p>
      </form>

      {/* ── Divider ── */}
      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-text-muted uppercase tracking-widest">{t("or")}</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* ── Google Sign-Up ── */}
      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        className="w-full flex items-center justify-center gap-3 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition-all hover:bg-surface-raised hover:border-border-strong focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
          <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
          <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
        </svg>
        {t("continueGoogleRegister")}
      </button>

      <p className="mt-6 text-center text-sm text-text-muted">
        {t("alreadyHaveAccount")}{" "}
        <Link href="/login" className="font-medium text-primary-light hover:text-primary transition-colors">
          {t("signInLink")}
        </Link>
      </p>
    </div>
  );
}
