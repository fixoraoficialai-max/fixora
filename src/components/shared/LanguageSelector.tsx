"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { SUPPORTED_LOCALES, type Locale } from "@/i18n/config";
import { setLocaleCookieAction } from "@/i18n/actions";

// ─── Locale metadata ──────────────────────────────────────────────────────────

const LOCALE_META: Record<Locale, { label: string; flag: string }> = {
  es: { label: "Español",  flag: "🇪🇸" },
  en: { label: "English",  flag: "🇺🇸" },
};

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Language selector — renders a native <select> for accessibility.
 * On change: writes cookie via Server Action, then refreshes the page
 * so the new locale is picked up by the server components.
 */
export function LanguageSelector() {
  const t                     = useTranslations("settings");
  const currentLocale         = useLocale() as Locale;
  const [isPending, startTransition] = useTransition();
  const router                = useRouter();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>): void {
    const locale = event.target.value;
    startTransition(async () => {
      await setLocaleCookieAction(locale);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3 mt-4 p-4 border border-border rounded-lg bg-surface/50">
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-primary-light" />
        <h3 className="text-sm font-medium text-text-primary">{t("language")}</h3>
      </div>

      <p className="text-xs text-text-muted">{t("languageLabel")}</p>

      <select
        value={currentLocale}
        onChange={handleChange}
        disabled={isPending}
        className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50 transition-colors"
        aria-label={t("language")}
      >
        {SUPPORTED_LOCALES.map((locale) => {
          const meta = LOCALE_META[locale];
          return (
            <option key={locale} value={locale}>
              {meta.flag} {meta.label}
            </option>
          );
        })}
      </select>
    </div>
  );
}
