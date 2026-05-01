import { Metadata } from "next";
import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Reset Password — Fixora Video",
  description: "Set a new password for your Fixora Video account.",
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="h-32 w-full animate-pulse bg-surface rounded-xl" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
