"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────
// Input
// ─────────────────────────────────────────────
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, icon, rightElement, ...props }, ref) => {
    return (
      <div className="relative flex items-center">
        {icon && (
          <div className="pointer-events-none absolute left-3 flex items-center text-text-muted">
            {icon}
          </div>
        )}
        <input
          type={type}
          ref={ref}
          className={cn(
            "flex h-10 w-full rounded-lg border bg-surface-elevated px-3 py-2 text-base text-text-primary",
            "placeholder:text-text-muted",
            "transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary/60",
            "disabled:cursor-not-allowed disabled:opacity-40",
            error
              ? "border-danger/60 focus:ring-danger/40"
              : "border-border hover:border-border-strong",
            icon && "pl-9",
            rightElement && "pr-10",
            className
          )}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-3 flex items-center">{rightElement}</div>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

// ─────────────────────────────────────────────
// Textarea
// ─────────────────────────────────────────────
export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-[80px] w-full rounded-lg border bg-surface-elevated px-3 py-2 text-base text-text-primary",
          "placeholder:text-text-muted resize-none",
          "transition-colors duration-150",
          "focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary/60",
          "disabled:cursor-not-allowed disabled:opacity-40",
          error
            ? "border-danger/60 focus:ring-danger/40"
            : "border-border hover:border-border-strong",
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";

// ─────────────────────────────────────────────
// Label
// ─────────────────────────────────────────────
export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      "text-sm font-medium text-text-secondary leading-none",
      "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
      className
    )}
    {...props}
  />
));

Label.displayName = LabelPrimitive.Root.displayName;

// ─────────────────────────────────────────────
// FormField — wraps Label + Input + Error
// ─────────────────────────────────────────────
interface FormFieldProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  error,
  hint,
  required,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <Label>
          {label}
          {required && <span className="text-danger ml-1">*</span>}
        </Label>
      )}
      {children}
      {error && (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs text-text-muted">{hint}</p>
      )}
    </div>
  );
}
