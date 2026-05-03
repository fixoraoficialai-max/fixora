"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Shield, Lock, AlertCircle } from "lucide-react";
import { ADMIN_PIN_CONFIG } from "@/lib/security/admin-pin";

// ─── reCAPTCHA loader ─────────────────────────────────────────────────────────

declare global {
  interface Window {
    grecaptcha: {
      ready: (cb: () => void) => void;
      render: (el: HTMLElement, opts: { sitekey: string; callback: (t: string) => void; theme: string }) => number;
      reset: (id: number) => void;
    };
  }
}

function loadRecaptchaScript(siteKey: string, onLoad: () => void) {
  if (document.getElementById("recaptcha-script")) { onLoad(); return; }
  const script  = document.createElement("script");
  script.id     = "recaptcha-script";
  script.src    = `https://www.google.com/recaptcha/api.js?render=explicit`;
  script.async  = true;
  script.defer  = true;
  script.onload = onLoad;
  document.head.appendChild(script);
}

// ─── Countdown hook ───────────────────────────────────────────────────────────

function useCountdown(initialMs: number) {
  const [remaining, setRemaining] = useState(initialMs);
  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1000)), 1000);
    return () => clearInterval(id);
  }, [remaining]);
  const reset = useCallback((ms: number) => setRemaining(ms), []);
  return { remaining, reset };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminVerifyPage() {
  const router                = useRouter();
  const [pin, setPin]         = useState("");
  const [error, setError]     = useState<string | null>(null);
  const [shake, setShake]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attemptsLeft, setAttemptsLeft]     = useState(ADMIN_PIN_CONFIG.maxAttempts);
  const [showRecaptcha, setShowRecaptcha]   = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [locked, setLocked]                 = useState(false);

  const { remaining: lockMs, reset: resetLock } = useCountdown(0);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const recaptchaWidgetId     = useRef<number | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";

  const lockSecs = Math.ceil(lockMs / 1000);

  // ── Init reCAPTCHA widget when needed ────────────────────────────────────────
  useEffect(() => {
    if (!showRecaptcha || !siteKey || !recaptchaContainerRef.current) return;

    loadRecaptchaScript(siteKey, () => {
      window.grecaptcha.ready(() => {
        if (!recaptchaContainerRef.current) return;
        recaptchaWidgetId.current = window.grecaptcha.render(recaptchaContainerRef.current, {
          sitekey:  siteKey,
          callback: (token: string) => setRecaptchaToken(token),
          theme:    "dark",
        });
      });
    });
  }, [showRecaptcha, siteKey]);

  // ── Shake animation ───────────────────────────────────────────────────────────
  function triggerShake() {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }

  // ── Submit ────────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || locked || pin.length < ADMIN_PIN_CONFIG.minLength) return;

    setSubmitting(true);
    setError(null);

    try {
      const res  = await fetch("/api/admin/verify", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ pin, recaptchaToken: recaptchaToken ?? undefined }),
      });
      const data = await res.json() as {
        success:         boolean;
        locked?:         boolean;
        remainingMs?:    number;
        attempts?:       number;
        attemptsLeft?:   number;
        requireRecaptcha?: boolean;
        error?:          string | { code: string; message: string; details?: unknown };
      };

      if (data.success) {
        router.replace("/admin");
        return;
      }

      // Locked out
      if (data.locked) {
        setLocked(true);
        resetLock(data.remainingMs ?? ADMIN_PIN_CONFIG.lockDurationMs);
        setError(null);
        setPin("");
        return;
      }

      // Wrong PIN
      triggerShake();
      setPin("");
      setRecaptchaToken(null);
      if (recaptchaWidgetId.current !== null) window.grecaptcha?.reset(recaptchaWidgetId.current);

      if (typeof data.attemptsLeft === "number") setAttemptsLeft(data.attemptsLeft as typeof ADMIN_PIN_CONFIG.maxAttempts);
      if (data.requireRecaptcha) setShowRecaptcha(true);

      let errorMessage = `PIN incorrecto. ${data.attemptsLeft ?? ""} intentos restantes.`;
      if (data.error) {
        if (typeof data.error === "string") {
          errorMessage = data.error;
        } else if (typeof data.error === "object" && data.error.message) {
          errorMessage = data.error.message;
        }
      }

      setError(errorMessage);
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Auto-unlock when countdown ends ──────────────────────────────────────────
  useEffect(() => {
    if (locked && lockMs <= 0) {
      setLocked(false);
      setAttemptsLeft(ADMIN_PIN_CONFIG.maxAttempts);
      setError(null);
    }
  }, [locked, lockMs]);

  const attemptsDone = ADMIN_PIN_CONFIG.maxAttempts - attemptsLeft;
  const pinReady     = pin.length >= ADMIN_PIN_CONFIG.minLength && pin.length <= ADMIN_PIN_CONFIG.maxLength;
  const canSubmit    = pinReady && !submitting && !locked && (!showRecaptcha || !!recaptchaToken);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className={`p-4 rounded-2xl border ${locked ? "border-danger/30 bg-danger/10" : "border-primary/30 bg-primary/10"}`}>
            {locked
              ? <Lock className="h-8 w-8 text-danger" />
              : <Shield className="h-8 w-8 text-primary-light" />}
          </div>
          <h1 className="text-xl font-bold text-text-primary">Panel de Administración</h1>
          <p className="text-sm text-text-muted text-center">
            {locked
              ? `Bloqueado por intentos fallidos`
              : "Ingresa tu PIN de acceso para continuar"}
          </p>
        </div>

        {/* Lockout screen */}
        {locked ? (
          <div className="rounded-2xl border border-danger/20 bg-danger/5 p-6 flex flex-col items-center gap-4 text-center">
            <div className="text-5xl font-mono font-bold text-danger tabular-nums">
              {String(Math.floor(lockSecs / 60)).padStart(2, "0")}:{String(lockSecs % 60).padStart(2, "0")}
            </div>
            <p className="text-sm text-danger/80">
              Demasiados intentos fallidos.<br />
              Espera para volver a intentarlo.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">

            {/* PIN input */}
            <div className={`transition-transform duration-100 ${shake ? "animate-[shake_0.4s_ease-in-out]" : ""}`}>
              <label htmlFor="pin-input" className="block text-xs font-medium text-text-muted mb-2">
                PIN ({ADMIN_PIN_CONFIG.minLength}–{ADMIN_PIN_CONFIG.maxLength} caracteres)
              </label>
              <input
                id="pin-input"
                type="password"
                maxLength={ADMIN_PIN_CONFIG.maxLength}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                disabled={submitting}
                autoFocus
                autoComplete="off"
                className="w-full rounded-xl border border-border bg-surface-elevated px-4 py-3 text-center text-2xl tracking-[0.5em] text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/60 transition-colors"
                placeholder="• • • • •"
              />
              <div className="flex justify-between mt-1.5">
                <span className="text-xs text-text-muted">{pin.length} / {ADMIN_PIN_CONFIG.maxLength}</span>
                {attemptsDone > 0 && (
                  <span className="text-xs text-warning font-medium">
                    Intento {attemptsDone} de {ADMIN_PIN_CONFIG.maxAttempts}
                  </span>
                )}
              </div>
            </div>

            {/* reCAPTCHA */}
            {showRecaptcha && siteKey && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-xs text-text-muted text-center">Verifica que eres humano para continuar</p>
                <div ref={recaptchaContainerRef} />
              </div>
            )}

            {/* Error */}
            {error && (
              <div role="alert" className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? "Verificando…" : "Acceder al Panel"}
            </button>

          </form>
        )}
      </div>

      {/* Shake keyframe */}
      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%     { transform: translateX(-8px); }
          40%     { transform: translateX(8px); }
          60%     { transform: translateX(-6px); }
          80%     { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}
