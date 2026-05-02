import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, type Locale } from "./config";

/**
 * Resolves the locale for each request.
 * Priority: cookie → Accept-Language header → default (es)
 * No routing changes — locales live entirely in cookies.
 */
export default getRequestConfig(async () => {
  const locale = await resolveLocale();

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the cookie locale if it is a supported locale. */
async function getLocaleFromCookie(): Promise<Locale | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get("NEXT_LOCALE")?.value;
  return isSupported(raw) ? raw : null;
}

/** Parses the best-match locale from the Accept-Language header. */
async function getLocaleFromBrowser(): Promise<Locale | null> {
  const headerStore = await headers();
  const acceptLang  = headerStore.get("accept-language") ?? "";
  const preferred   = acceptLang.split(",").map((entry) => entry.split(";")[0]?.trim().slice(0, 2));
  return preferred.find(isSupported) ?? null;
}

/**
 * Determines the locale to use for this request.
 * Single responsibility: encapsulates the priority logic.
 */
async function resolveLocale(): Promise<Locale> {
  return (
    (await getLocaleFromCookie()) ??
    (await getLocaleFromBrowser()) ??
    DEFAULT_LOCALE
  );
}

function isSupported(value: string | undefined): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale);
}
