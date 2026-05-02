"use client";

import { Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/layout/sidebar-context";

interface TopBarProps {
  title:        string;
  description?: string;
  actions?:     React.ReactNode;
}

export function TopBar({ title, description, actions }: TopBarProps) {
  const { openSidebar } = useSidebar();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4 md:px-6">
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger — mobile only */}
        <button
          className="md:hidden rounded-md p-1.5 text-text-muted hover:text-text-primary transition-colors shrink-0"
          onClick={openSidebar}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex flex-col justify-center min-w-0">
          <h1 className="text-sm font-semibold text-text-primary truncate">{title}</h1>
          {description && (
            <p className="text-xs text-text-muted truncate">{description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {actions}
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
