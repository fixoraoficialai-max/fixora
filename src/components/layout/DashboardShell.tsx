/**
 * DashboardShell
 *
 * Client boundary that owns the mobile sidebar open/close state.
 * The dashboard layout (server) passes its children here so pages
 * remain server components while the shell handles all interactivity.
 *
 * Desktop: Sidebar is static, part of flex layout.
 * Mobile:  Sidebar is a fixed overlay; hamburger in TopBar opens it.
 */

"use client";

import { useState, useCallback } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { SidebarContext } from "@/components/layout/sidebar-context";

interface DashboardShellProps {
  children:     React.ReactNode;
  userCredits:  number;
  userName?:    string | null;
  userEmail?:   string | null;
  userImage?:   string | null;
}

export function DashboardShell({
  children,
  userCredits,
  userName,
  userEmail,
  userImage,
}: DashboardShellProps) {
  const [isMobileOpen, setMobileOpen] = useState(false);

  const openSidebar  = useCallback(() => setMobileOpen(true),  []);
  const closeSidebar = useCallback(() => setMobileOpen(false), []);

  return (
    <SidebarContext.Provider value={{ openSidebar }}>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar
          userCredits={userCredits}
          userName={userName}
          userEmail={userEmail}
          userImage={userImage}
          isMobileOpen={isMobileOpen}
          onMobileClose={closeSidebar}
        />

        {/* min-w-0 prevents content from overflowing its flex column on mobile */}
        <main className="flex flex-1 flex-col overflow-y-auto min-w-0">
          {children}
        </main>
      </div>
    </SidebarContext.Provider>
  );
}
