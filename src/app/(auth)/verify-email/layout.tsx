import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verify your email — Fixora",
  description: "Verify your email address to activate your Fixora account.",
};

export default function VerifyEmailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
