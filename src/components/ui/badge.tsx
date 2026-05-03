"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const badgeVariants = {
  default:
    "bg-surface-elevated border border-border text-text-secondary",
  primary:
    "bg-primary/15 border border-primary/30 text-primary-light",
  success:
    "bg-success/15 border border-success/30 text-success",
  warning:
    "bg-warning/15 border border-warning/30 text-warning",
  danger:
    "bg-danger/15 border border-danger/30 text-danger",
  accent:
    "bg-accent/15 border border-accent/30 text-accent-light",
} as const;

export type BadgeVariant = keyof typeof badgeVariants;

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

export function Badge({
  className,
  variant = "default",
  dot,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        badgeVariants[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn("h-1.5 w-1.5 rounded-full bg-current")}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

// Convenience mapping from domain status to badge variant
import type { VideoStatus, ProjectStatus } from "@/types";

export function VideoStatusBadge({ status }: { status: VideoStatus }) {
  const t = useTranslations("common");
  const variants: Record<VideoStatus, BadgeVariant> = {
    PENDING:    "default",
    QUEUED:     "primary",
    PROCESSING: "warning",
    COMPLETED:  "success",
    FAILED:     "danger",
  };
  const labels: Record<VideoStatus, string> = {
    PENDING:    t("statusPending"),
    QUEUED:     t("statusQueued"),
    PROCESSING: t("statusProcessing"),
    COMPLETED:  t("statusCompleted"),
    FAILED:     t("statusFailed"),
  };
  return <Badge variant={variants[status]} dot>{labels[status]}</Badge>;
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const t = useTranslations("common");
  const variants: Record<ProjectStatus, BadgeVariant> = {
    DRAFT:       "default",
    IN_PROGRESS: "primary",
    COMPLETED:   "success",
    ARCHIVED:    "default",
  };
  const labels: Record<ProjectStatus, string> = {
    DRAFT:       t("statusDraft"),
    IN_PROGRESS: t("statusInProgress"),
    COMPLETED:   t("statusCompleted"),
    ARCHIVED:    t("statusArchived"),
  };
  return <Badge variant={variants[status]} dot>{labels[status]}</Badge>;
}
