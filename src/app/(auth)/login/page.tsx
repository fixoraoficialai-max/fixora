import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { PageLoader } from "@/components/shared/LoadingSpinner";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your Fixora account.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <LoginForm />
    </Suspense>
  );
}
