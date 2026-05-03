"use client";

import { cn } from "@/lib/utils";

interface FormAlertProps {
  variant?: "error" | "success" | "warning";
  size?: "sm" | "md";
  children: React.ReactNode;
  className?: string;
}

export function FormAlert({
  variant = "error",
  size = "sm",
  children,
  className,
}: FormAlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        "border",
        size === "sm" ? "rounded-md px-3 py-2 text-xs" : "rounded-lg px-4 py-3 text-sm",
        variant === "error"
          ? "border-danger/30 bg-danger/10 text-danger"
          : variant === "success"
          ? "border-success/30 bg-success/10 text-success flex items-center gap-2"
          : "border-warning/30 bg-warning/10 text-warning",
        className
      )}
    >
      {children}
    </div>
  );
}
