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

    // If reCAPTCHA is visible AND configured, it must be completed before submitting
    const captchaRequired = showRecaptcha && !!siteKey;
    const recaptchaToken  = captchaRequired ? recaptchaRef.current?.getValue() ?? "" : undefined;
    if (captchaRequired && !recaptchaToken) {
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
        <p className="mt-2 text-sm text-text-muted">Sign in to your Fixora Video account</p>
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

      {/* ── Divider ── */}
      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-text-muted uppercase tracking-widest">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* ── Google Sign-In ── */}
      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl })}
        className="w-full flex items-center justify-center gap-3 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition-all hover:bg-surface-raised hover:border-border-strong focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
          <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
          <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
        </svg>
        Continue with Google
      </button>

      <p className="mt-6 text-center text-sm text-text-muted">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-primary-light hover:text-primary transition-colors">
          Create one for free
        </Link>
      </p>
    </div>
  );
}
