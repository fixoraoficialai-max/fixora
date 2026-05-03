/**
 * MarketingNav
 *
 * Client component — requires useState for the mobile menu toggle.
 * Extracted from the landing page (server component) to keep pages as lean
 * server components while adding interactivity only where needed.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export function MarketingNav() {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations("marketing");

  const NAV_LINKS = [
    { href: "#features",     label: t("navFeatures") },
    { href: "#pricing",      label: t("navPricing") },
    { href: "#how-it-works", label: t("navHowItWorks") },
  ];

  const close = () => setIsOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border glass">
      <nav
        className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="Fixora Video" width={28} height={28} className="rounded-lg" />
          <span className="font-bold tracking-tight">
            <span className="text-text-primary">Fixora</span>{" "}
            <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
              Video
            </span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-3 md:flex">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">{t("signIn")}</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/register">
              {t("getStarted")} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden rounded-md p-1.5 text-text-muted hover:text-text-primary transition-colors"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label={isOpen ? t("closeMenu") : t("openMenu")}
          aria-expanded={isOpen}
          aria-controls="mobile-nav"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile dropdown */}
      {isOpen && (
        <div
          id="mobile-nav"
          className="border-t border-border bg-surface md:hidden"
          role="navigation"
          aria-label="Mobile navigation"
        >
          <div className="mx-auto max-w-6xl flex flex-col gap-1 px-6 py-4">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={close}
                className="rounded-lg px-3 py-2.5 text-sm text-text-secondary hover:bg-surface-elevated hover:text-text-primary transition-all"
              >
                {label}
              </Link>
            ))}

            <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
              <Button variant="secondary" asChild>
                <Link href="/login" onClick={close}>{t("signIn")}</Link>
              </Button>
              <Button asChild>
                <Link href="/register" onClick={close}>
                  {t("getStarted")} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
