import * as Sentry from "@sentry/nextjs";

/**
 * Sentry server-side configuration.
 * Runs in Node.js API routes — captures backend errors.
 */
Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  enabled: process.env.NODE_ENV === "production",

  // Capture 10% of server transactions
  tracesSampleRate: 0.1,

  // Do NOT send personally identifiable information (GDPR compliance)
  sendDefaultPii: false,
});
