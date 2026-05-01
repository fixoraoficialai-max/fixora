"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

type VerifyState = "loading" | "success" | "already_verified" | "expired" | "error";

// ─── Component ────────────────────────────────────────────────────────────────

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const token        = searchParams.get("token");

  const [state,   setState]   = useState<VerifyState>("loading");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!token) { setState("error"); return; }
    verifyToken(token);
  }, [token]);

  async function verifyToken(t: string) {
    try {
      const res  = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(t)}`);
      const data = await res.json() as { success: boolean; data?: { alreadyVerified?: boolean }; error?: { code: string } };

      if (data.success) {
        setState(data.data?.alreadyVerified ? "already_verified" : "success");
        return;
      }

      if (data.error?.code === "TOKEN_EXPIRED") { setState("expired"); return; }
      setState("error");
    } catch {
      setState("error");
    }
  }

  async function resendVerification() {
    setSending(true);
    try {
      await fetch("/api/auth/send-verification", { method: "POST" });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center">
        {state === "loading" && (
          <>
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary-light" />
            <h1 className="mt-6 text-xl font-semibold text-text-primary">Verifying your email…</h1>
            <p className="mt-2 text-sm text-text-muted">Please wait a moment.</p>
          </>
        )}

        {(state === "success" || state === "already_verified") && (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
            <h1 className="mt-6 text-xl font-semibold text-text-primary">Email verified!</h1>
            <p className="mt-2 text-sm text-text-muted">
              {state === "already_verified"
                ? "Your email was already verified."
                : "Your account is now fully active. Welcome to Fixora!"}
            </p>
            <Button className="mt-8 w-full" onClick={() => router.push("/dashboard")}>
              Go to Dashboard
            </Button>
          </>
        )}

        {state === "expired" && (
          <>
            <XCircle className="mx-auto h-12 w-12 text-warning" />
            <h1 className="mt-6 text-xl font-semibold text-text-primary">Link expired</h1>
            <p className="mt-2 text-sm text-text-muted">
              This verification link has expired. Request a new one below.
            </p>
            <Button
              className="mt-8 w-full"
              isLoading={sending}
              onClick={resendVerification}
            >
              <Mail className="mr-2 h-4 w-4" />
              {sending ? "Sending…" : "Resend verification email"}
            </Button>
          </>
        )}

        {state === "error" && (
          <>
            <XCircle className="mx-auto h-12 w-12 text-danger" />
            <h1 className="mt-6 text-xl font-semibold text-text-primary">Invalid link</h1>
            <p className="mt-2 text-sm text-text-muted">
              This verification link is invalid or has already been used.
            </p>
            <Button variant="outline" className="mt-8 w-full" onClick={() => router.push("/login")}>
              Back to sign in
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
