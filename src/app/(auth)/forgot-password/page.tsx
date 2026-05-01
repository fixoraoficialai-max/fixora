import { Metadata } from "next";
import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot Password — Fixora Video",
  description: "Reset your Fixora Video password.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
