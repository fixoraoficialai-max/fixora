"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { Mail, Lock, ShieldAlert, Clock } from "lucide-react";
import ReCAPTCHA from "react-google-recaptcha";
import { Button } from "@/components/ui/button";
import { Input, FormField } from "@/components/ui/input";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

type LoginCheckResponse = {
  success: boolean;
  error?: {
    code: string;
    message: string;
    details?: { attempts?: number; locked?: boolean; retryAfterMs?: number };
  };
};

// ─── Lockout Countdown Hook ───────────────────────────────────────────────────

/** Displays a live countdown in MM:SS format while the account is locked. */
function useCountdown(retryAfterMs: number) {
  const [remaining, setRemaining] = useState(retryAfterMs);

  useEffect(() => {
    if (retryAfterMs <= 0) { setRemaining(0); return; }
    setRemaining(retryAfterMs);
    const interval = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1000) { clearInterval(interval); return 0; }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [retryAfterMs]);

  const seconds = Math.ceil(remaining / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return { remaining, display: `${minutes}:${secs.toString().padStart(2, "0")}` };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const [serverError, setServerError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);       // Failed attempts so far
  const [lockedMs, setLockedMs] = useState(0);       // ms until lockout expires
  const [isLocked, setIsLocked] = useState(false);

  const { remaining: lockRemaining, display: lockDisplay } = useCountdown(lockedMs);

  // Unlock the form once the countdown reaches zero
  useEffect(() => {
    if (isLocked && lockRemaining === 0) {
      setIsLocked(false);
      setLockedMs(0);
      setServerError(null);
    }
  }, [isLocked, lockRemaining]);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  // reCAPTCHA must appear after the FIRST failure (not on initial load)
  const showRecaptcha = attempts >= 1 && !isLocked;
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";

  const onSubmit = useCallback(async (data: LoginInput) => {
    setServerError(null);

    // If reCAPTCHA is visible, it must be completed before submitting
    const recaptchaToken = showRecaptcha ? recaptchaRef.current?.getValue() ?? "" : undefined;
    if (showRecaptcha && !recaptchaToken) {
      setServerError("Please complete the reCAPTCHA verification.");
      return;
    }

    // 1. Pre-flight check: lockout + reCAPTCHA verified server-side
    const checkRes = await fetch("/api/auth/check-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, recaptchaToken }),
    });

    const checkData = await checkRes.json() as LoginCheckResponse;

    if (!checkData.success) {
      const code = checkData.error?.code;
      const details = checkData.error?.details;

      recaptchaRef.current?.reset(); // Always reset reCAPTCHA on failure

      if (code === "ACCOUNT_LOCKED") {
        setIsLocked(true);
        setLockedMs(details?.retryAfterMs ?? 60_000);
        setAttempts(details?.attempts ?? attempts);
        setServerError(checkData.error?.message ?? "Account temporarily locked.");
        return;
      }

      if (code === "RECAPTCHA_FAILED") {
        setServerError("reCAPTCHA failed. Please try again.");
        return;
      }

      if (code === "INVALID_CREDENTIALS") {
        const newAttempts = details?.attempts ?? attempts + 1;
        setAttempts(newAttempts);

        if (details?.locked && details.retryAfterMs) {
          setIsLocked(true);
          setLockedMs(details.retryAfterMs);
          setServerError(`Too many attempts. Account locked for ${Math.ceil(details.retryAfterMs / 60000)} minute(s).`);
        } else {
          const remaining = 3 - (newAttempts % 3);
          setServerError(
            `Invalid email or password. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining before lockout.`
          );
        }
        return;
      }

      setServerError("An unexpected error occurred. Please try again.");
      return;
    }

    // 2. Credentials verified — now create the session via NextAuth
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (result?.error) {
      // This should not happen since we already verified — safety net
      setServerError("Sign-in failed unexpectedly. Please try again.");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }, [showRecaptcha, attempts, callbackUrl, router]);

  const isFormDisabled = isSubmitting || isLocked;

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-text-primary">Welcome back</h1>
        <p className="mt-2 text-sm text-text-muted">Sign in to your Fixora account</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">

        {/* ── Lockout Banner ── */}
        {isLocked && (
          <div role="alert" className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-warning">Account Temporarily Locked</p>
              <p className="text-xs text-text-muted">Too many failed attempts. Please wait before trying again.</p>
              <div className="flex items-center gap-1.5 mt-1">
                <Clock className="h-3.5 w-3.5 text-warning" />
                <span className="text-sm font-mono font-bold text-warning">{lockDisplay}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Error Banner ── */}
        {serverError && !isLocked && (
          <div role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {serverError}
          </div>
        )}

        {/* ── Attempt Counter ── */}
        {attempts > 0 && attempts < 3 && !isLocked && (
          <div className="flex gap-1 justify-center">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className={`h-1.5 w-8 rounded-full transition-all ${i <= attempts ? "bg-danger" : "bg-border"}`}
              />
            ))}
          </div>
        )}

        <FormField label="Email" error={errors.email?.message} required>
          <Input
            type="email"
            placeholder="you@company.com"
            icon={<Mail className="h-4 w-4" />}
            autoComplete="email"
            autoFocus
            disabled={isFormDisabled}
            {...register("email")}
            error={errors.email?.message}
          />
        </FormField>

        <FormField label="Password" error={errors.password?.message} required>
          <Input
            type="password"
            placeholder="Your password"
            icon={<Lock className="h-4 w-4" />}
            autoComplete="current-password"
            disabled={isFormDisabled}
            {...register("password")}
            error={errors.password?.message}
          />
        </FormField>

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-xs text-text-muted hover:text-text-secondary transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        {/* ── reCAPTCHA — only after 1st failure ── */}
        {showRecaptcha && siteKey && (
          <div className="flex justify-center">
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey={siteKey}
              theme="dark"
            />
          </div>
        )}

        <Button type="submit" isLoading={isSubmitting} disabled={isFormDisabled} className="w-full mt-1">
          {isLocked ? `Locked — wait ${lockDisplay}` : isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-muted">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-primary-light hover:text-primary transition-colors">
          Create one for free
        </Link>
      </p>
    </div>
  );
}
