import * as Sentry from "@sentry/nextjs";

/**
 * Sentry client-side configuration.
 * Runs in the browser — captures frontend errors and performance.
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable in production — no noise during development
  enabled: process.env.NODE_ENV === "production",

  // Capture 10% of transactions for performance monitoring (free tier friendly)
  tracesSampleRate: 0.1,

  // Capture 100% of errors
  replaysOnErrorSampleRate: 1.0,

  // 10% of sessions recorded for replay
  replaysSessionSampleRate: 0.1,

  // Do NOT send personally identifiable information
  sendDefaultPii: false,
});
