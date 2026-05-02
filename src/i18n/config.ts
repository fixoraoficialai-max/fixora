/** Locales supported by the app. Add new locales here when needed. */
export const SUPPORTED_LOCALES = ["es", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "es";

/** Cookie name used to persist the user's language preference. */
export const LOCALE_COOKIE = "NEXT_LOCALE";
