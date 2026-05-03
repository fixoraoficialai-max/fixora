import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, type Locale } from "./config";

/**
 * Resolves the locale for each request.
 * Priority: NEXT_LOCALE cookie → default (es)
 *
 * Browser Accept-Language is intentionally NOT used.
 * Fixora targets Spanish-speaking users: the default is always "es"
 * unless the user explicitly switches language in Settings.
 */
export default getRequestConfig(async () => {
  const locale = await resolveLocale();

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the validated locale from the cookie, or the default locale.
 * Single responsibility: reads and validates one value.
 */
async function resolveLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const raw         = cookieStore.get("NEXT_LOCALE")?.value;
  return isSupported(raw) ? raw : DEFAULT_LOCALE;
}

function isSupported(value: string | undefined): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale);
}
