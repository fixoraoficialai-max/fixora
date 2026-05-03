"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  History,
  Settings,
  Zap,
  LogOut,
  ChevronRight,
  Sparkles,
  Video,
  MessageSquare,
  Users,
  Grid,
  Megaphone,
  Clapperboard,
  Image as ImageIcon,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

// translationKey maps to sidebar.nav* in messages/*.json
const NAV_ITEMS = [
  { translationKey: "navDashboard", href: "/dashboard", icon: LayoutDashboard },
  { translationKey: "navProjects",  href: "/projects",  icon: FolderOpen },
  { translationKey: "navStudio",    href: "/studio",    icon: Clapperboard },
  { translationKey: "navHistory",   href: "/history",   icon: History },
  { translationKey: "navSettings",  href: "/settings",  icon: Settings },
] as const;

const QUICK_ITEMS = [
  { translationKey: "quickPrompt",      href: "/create/prompt",      icon: MessageSquare, credits: "1 cr"  },
  { translationKey: "quickImage",       href: "/create/image",       icon: ImageIcon,     credits: "2 cr"  },
  { translationKey: "quickVideo",       href: "/create/video",       icon: Video,         credits: "5 cr"  },
  { translationKey: "quickAvatarAI",    href: "/create/clone",       icon: Users,         credits: "10 cr" },
  { translationKey: "quickMultiAvatar", href: "/create/multi-clone", icon: Grid,          credits: "40 cr" },
  { translationKey: "quickAdCreator",   href: "/create/ad",          icon: Megaphone,     credits: "25 cr" },
] as const;

interface SidebarProps {
  userCredits?:  number;
  userName?:     string | null;
  userEmail?:    string | null;
  userImage?:    string | null;
  /** Controlled by DashboardShell — whether the mobile drawer is open */
  isMobileOpen?: boolean;
  /** Called when the mobile drawer should close (backdrop click, route change) */
  onMobileClose?: () => void;
}

export function Sidebar({
  userCredits = 0,
  userName,
  userEmail,
  userImage,
  isMobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();
  const t        = useTranslations("sidebar");

  // Auto-close the mobile drawer whenever the user navigates to a new page
  useEffect(() => {
    onMobileClose?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      {/* ── Mobile backdrop ─────────────────────────────────────────────── */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar panel ───────────────────────────────────────────────── */}
      <aside
        className={cn(
          "flex h-screen w-60 shrink-0 flex-col border-r border-border bg-surface z-40",
          // Mobile: fixed overlay with slide animation
          "fixed inset-y-0 left-0 transition-transform duration-300 ease-in-out",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop: back in normal flow, always visible
          "md:static md:translate-x-0",
        )}
      >
      {/* Logo */}
      <div className="flex h-14 items-center gap-3 border-b border-border px-4">
        <Image src="/logo.png" alt="Fixora Video" width={28} height={28} className="rounded-lg" />
        <span className="font-bold tracking-tight text-text-primary">Fixora</span>
      </div>

      {/* Create with AI button */}
      <div className="p-3">
        <Link
          href="/create"
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium",
            "bg-gradient-primary text-white shadow-glow-sm",
            "hover:opacity-90 transition-all",
            pathname === "/create" && "opacity-90"
          )}
        >
          <Sparkles className="h-4 w-4" />
          {t("createWithAi")}
        </Link>
      </div>

      {/* Quick Create */}
      <div className="px-3 pb-2">
        <p className="px-2 mb-1.5 text-2xs font-semibold text-text-muted uppercase tracking-wider">
          {t("quickCreate")}
        </p>
        <div className="flex flex-col gap-0.5">
          {QUICK_ITEMS.map(({ translationKey, href, icon: Icon, credits }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-xs transition-all",
                  isActive
                    ? "bg-primary/10 text-primary-light font-medium"
                    : "text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
                )}
              >
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                {t(translationKey)}
                <span className="ml-auto text-2xs text-text-muted">{credits}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-3 mb-2 border-t border-border" />

      {/* Navigation */}
      <nav className="flex-1 px-3 pb-3" aria-label="Main navigation">
        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.map(({ translationKey, href, icon: Icon }) => {
            const isActive =
              href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(href);

            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                    isActive
                      ? "bg-primary/10 text-primary-light font-medium"
                      : "text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-primary" : "text-text-muted")} />
                  {t(translationKey)}
                  {isActive && <ChevronRight className="ml-auto h-3 w-3 text-primary/50" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Credits */}
      <div className="border-t border-border p-3">
        {/* Low credits alert banner */}
        <LowCreditsAlert balance={userCredits} />

        <div className="rounded-lg border border-border bg-surface-elevated p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary">{t("credits")}</span>
            <span className="text-xs font-bold text-text-primary tabular-nums">{t("creditsLeft", { n: userCredits })}</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-surface-overlay">
            <div
              className="h-full rounded-full bg-gradient-primary transition-all duration-300"
              style={{ width: `${Math.min(100, (userCredits / 50) * 100)}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-2xs text-text-muted">{t("freeTier")}</p>
            <Link href="/settings" className="text-2xs text-primary-light hover:underline">
              {t("buyMore")}
            </Link>
          </div>
        </div>
      </div>

      {/* User */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <UserAvatar name={userName} image={userImage} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-text-primary">{userName ?? t("userFallback")}</p>
            <p className="truncate text-2xs text-text-muted">{userEmail}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-md p-1 text-text-muted hover:text-text-secondary transition-colors"
            aria-label={t("signOut")}
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      </aside>
    </>
  );
}

// ─── LowCreditsAlert ─────────────────────────────────────────────────────────

const WARNING_THRESHOLD  = 5;
const CRITICAL_THRESHOLD = 0;

function LowCreditsAlert({ balance }: { balance: number }) {
  const t          = useTranslations("sidebar");
  if (balance > WARNING_THRESHOLD) return null;

  const isCritical = balance <= CRITICAL_THRESHOLD;

  return (
    <Link
      href="/settings"
      className={cn(
        "flex items-start gap-2 rounded-lg border px-2.5 py-2 mb-2 text-xs transition-all hover:opacity-80",
        isCritical
          ? "border-danger/30 bg-danger/10 text-danger"
          : "border-warning/30 bg-warning/10 text-warning"
      )}
      aria-label={t(isCritical ? "noCreditsAria" : "lowCreditsAria")}
    >
      {isCritical
        ? <AlertCircle   className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        : <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />}
      <span className="leading-snug">
        {isCritical
          ? t("outOfCredits")
          : t("lowCredits", { n: balance })}
      </span>
    </Link>
  );
}

// ─── UserAvatar ───────────────────────────────────────────────────────────────

function UserAvatar({ name, image }: { name?: string | null; image?: string | null }) {
  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  if (image) {
    return (
      <img src={image} alt={name ?? "User"} className="h-7 w-7 rounded-full object-cover" />
    );
  }

  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-primary-light text-2xs font-semibold">
      {initials}
    </div>
  );
}