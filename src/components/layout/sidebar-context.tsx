/**
 * SidebarContext
 *
 * Shares the "open mobile sidebar" action between DashboardShell (owner)
 * and TopBar (consumer) without prop drilling through server components.
 *
 * Usage:
 *   - DashboardShell: wraps the tree with <SidebarContext.Provider value={{ openSidebar }}>
 *   - TopBar: calls useSidebar().openSidebar() when the hamburger is clicked
 */

"use client";

import { createContext, useContext } from "react";

interface SidebarContextValue {
  openSidebar: () => void;
}

// Safe default so TopBar never throws if accidentally used outside the provider
export const SidebarContext = createContext<SidebarContextValue>({
  openSidebar: () => {},
});

/** Consume the sidebar context inside any client component. */
export function useSidebar(): SidebarContextValue {
  return useContext(SidebarContext);
}
