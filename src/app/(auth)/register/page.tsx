import type { Metadata } from "next";
import { RegisterForm } from "@/features/auth/components/RegisterForm";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create your free Fixora account and start generating AI videos.",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
