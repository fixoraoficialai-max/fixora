import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const isProd = process.env.NODE_ENV === "production";

// ─── Content Security Policy ──────────────────────────────────────────────────
// 'unsafe-eval' is required by Next.js in development (for HMR/hot reload).
// In production we remove it to prevent XSS attacks that execute injected scripts.
const scriptSrc = isProd
  ? "script-src 'self' 'unsafe-inline'"
  : "script-src 'self' 'unsafe-eval' 'unsafe-inline'";

const csp = [
  "default-src 'self'",
  scriptSrc,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  // Fal.ai storage, upload, and queue endpoints — required for AI generation
  "connect-src 'self' https://*.fal.media https://queue.fal.run https://fal.run wss://fal.run https://storage.googleapis.com https://www.google.com",
  "media-src 'self' blob: https://*.fal.media https://storage.googleapis.com",
  // reCAPTCHA v2 requires Google's script and iframe
  "script-src-elem 'self' 'unsafe-inline' https://www.google.com https://www.gstatic.com",
  "frame-src https://www.google.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

// ─── Security Headers ─────────────────────────────────────────────────────────
const securityHeaders = [
  // Blocks clickjacking completely
  { key: "X-Frame-Options", value: "DENY" },
  // Prevents browsers from MIME-type sniffing (a common attack vector)
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Controls referrer data sent with requests
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disables browser features that aren't needed
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Forces HTTPS for 2 years in production (don't set in dev — breaks localhost)
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
  // Content Security Policy
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "v3b.fal.media" },
      { protocol: "https", hostname: "fal.media" },
      { protocol: "https", hostname: "storage.googleapis.com" },
    ],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  async redirects() {
    return [
      { source: "/home", destination: "/", permanent: true },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  widenClientFileUpload: true,

  // Source maps: uploaded to Sentry but hidden from the browser
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  disableLogger: true,
  automaticVercelMonitors: false,
});
