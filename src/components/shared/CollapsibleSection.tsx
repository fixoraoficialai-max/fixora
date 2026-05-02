"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  /** Icon shown left of the title */
  icon:          React.ReactNode;
  title:         string;
  description?:  string;
  children:      React.ReactNode;
  /** Whether the section starts expanded */
  defaultOpen?:  boolean;
}

/**
 * Accordion-style card used in Settings.
 * Single responsibility: toggle visibility of its children.
 * Uses no external state management — self-contained.
 */
export function CollapsibleSection({
  icon,
  title,
  description,
  children,
  defaultOpen = false,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      {/* ── Trigger ─────────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-surface-elevated transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <div className="flex items-center gap-3">
          <span className="text-text-muted">{icon}</span>
          <div>
            <p className="text-sm font-semibold text-text-primary">{title}</p>
            {description && (
              <p className="text-xs text-text-muted mt-0.5">{description}</p>
            )}
          </div>
        </div>

        <ChevronDown
          className={cn(
            "h-4 w-4 text-text-muted transition-transform duration-200 shrink-0",
            isOpen && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      {isOpen && (
        <div className="px-5 pb-5 border-t border-border">
          {children}
        </div>
      )}
    </div>
  );
}
