import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-xl",
        "border border-dashed border-border bg-surface/50 p-12 text-center",
        className
      )}
    >
      <div className="rounded-xl border border-border bg-surface-elevated p-4">
        <Icon className="h-8 w-8 text-text-muted" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-semibold text-text-primary">{title}</p>
        {description && (
          <p className="text-sm text-text-muted max-w-sm">{description}</p>
        )}
      </div>
      {action && (
        <Button onClick={action.onClick} size="sm">
          {action.label}
        </Button>
      )}
    </div>
  );
}
