"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { User, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, FormField } from "@/components/ui/input";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";

export function RegisterForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
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
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        password: data.password,
      }),
    });

    const result = await response.json() as { success: boolean; error?: { message: string } };

    if (!result.success) {
      setServerError(result.error?.message ?? "Registration failed. Please try again.");
      return;
    }

    const signInResult = await signIn("credentials", {
      email: data.email,
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

  const EyeToggle = ({
    show,
    onToggle,
  }: {
    show: boolean;
    onToggle: () => void;
  }) => (
    <button
      type="button"
      onClick={onToggle}
      className="text-text-muted hover:text-text-primary transition-colors"
      tabIndex={-1}
    >
      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-text-primary">Create your account</h1>
        <p className="mt-2 text-sm text-text-muted">
          Start creating AI videos for free
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        {serverError && (
          <div
            role="alert"
            className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
          >
            {serverError}
          </div>
        )}

        <FormField label="Full name" error={errors.name?.message} required>
          <Input
            type="text"
            placeholder="John Doe"
            icon={<User className="h-4 w-4" />}
            autoComplete="name"
            autoFocus
            {...register("name")}
            error={errors.name?.message}
          />
        </FormField>

        <FormField label="Email" error={errors.email?.message} required>
          <Input
            type="email"
            placeholder="you@company.com"
            icon={<Mail className="h-4 w-4" />}
            autoComplete="email"
            {...register("email")}
            error={errors.email?.message}
          />
        </FormField>

        <FormField
          label="Password"
          error={errors.password?.message}
          hint="Min 8 characters with uppercase, lowercase, and number"
          required
        >
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="Create a strong password"
            icon={<Lock className="h-4 w-4" />}
            rightElement={
              <EyeToggle
                show={showPassword}
                onToggle={() => setShowPassword((v) => !v)}
              />
            }
            autoComplete="new-password"
            {...register("password")}
            error={errors.password?.message}
          />
        </FormField>

        <FormField label="Confirm password" error={errors.confirmPassword?.message} required>
          <Input
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Repeat your password"
            icon={<Lock className="h-4 w-4" />}
            rightElement={
              <EyeToggle
                show={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((v) => !v)}
              />
            }
            autoComplete="new-password"
            {...register("confirmPassword")}
            error={errors.confirmPassword?.message}
          />
        </FormField>

        <Button type="submit" isLoading={isSubmitting} className="w-full mt-1">
          {isSubmitting ? "Creating account..." : "Create account"}
        </Button>

        <p className="text-center text-xs text-text-muted">
          By creating an account, you agree to our{" "}
          <Link href="/terms" className="underline hover:text-text-secondary">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-text-secondary">
            Privacy Policy
          </Link>
          .
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-text-muted">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-primary-light hover:text-primary transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
