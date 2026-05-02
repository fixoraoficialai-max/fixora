"use server";

import { cookies } from "next/headers";
import { SUPPORTED_LOCALES, LOCALE_COOKIE, type Locale } from "@/i18n/config";

/**
 * Sets the user's preferred locale in a cookie.
 * Server Action — called from the language selector client component.
 * Single responsibility: validates locale + writes cookie.
 */
export async function setLocaleCookieAction(locale: string): Promise<void> {
  if (!SUPPORTED_LOCALES.includes(locale as Locale)) {
    throw new Error(`Unsupported locale: ${locale}`);
  }

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    path:     "/",
    maxAge:   60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
    secure:   process.env.NODE_ENV === "production",
    httpOnly: false, // readable client-side for hydration
  });
}
