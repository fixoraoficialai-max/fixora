/**
 * Central security module.
 * Every security primitive lives here — import from this file, never inline.
 *
 * Rules:
 *  - Each function does exactly ONE thing.
 *  - No side-effects outside their documented purpose.
 *  - All functions are pure and throw on invalid state.
 */

import { NextRequest } from "next/server";
import { ApiErrors } from "@/lib/api/response";


// ─── SSRF Guard ───────────────────────────────────────────────────────────────

/**
 * Domains we are allowed to proxy through /api/download.
 * ONLY Fal.ai storage endpoints are trusted.
 * Add new domains here (and only here) if a new storage provider is integrated.
 */
const ALLOWED_PROXY_HOSTNAMES = new Set([
  "v3b.fal.media",
  "fal.media",
  "storage.googleapis.com",   // Fal.ai uses GCS under the hood
  "cdn.fal.ai",
]);

/**
 * Validates that a URL is safe to proxy — i.e. it points to a trusted storage domain.
 * Returns the parsed URL on success, or an API error response on failure.
 *
 * Usage:
 *   const result = assertAllowedProxyUrl(rawUrl);
 *   if ("hostname" in result === false) return result; // it's a NextResponse error
 */
export function assertAllowedProxyUrl(raw: string | null): URL | ReturnType<typeof ApiErrors.validation> {
  if (!raw) return ApiErrors.validation({ url: "url parameter is required" });

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return ApiErrors.validation({ url: "Invalid URL format" });
  }

  if (parsed.protocol !== "https:") {
    return ApiErrors.validation({ url: "Only HTTPS URLs are allowed" });
  }

  if (!ALLOWED_PROXY_HOSTNAMES.has(parsed.hostname)) {
    return ApiErrors.validation({ url: `Domain '${parsed.hostname}' is not allowed` });
  }

  return parsed;
}

// ─── Webhook Authentication ───────────────────────────────────────────────────

const WEBHOOK_SECRET_HEADER = "x-fal-signature";

/**
 * Validates that an incoming webhook request carries the correct shared secret.
 * The secret is compared using constant-time comparison to prevent timing attacks.
 *
 * Returns true if the request is authentic, false otherwise.
 */
export function isValidWebhookRequest(req: NextRequest): boolean {
  const secret = process.env.FAL_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[security] FAL_WEBHOOK_SECRET is not set — rejecting all webhooks");
    return false;
  }

  const provided = req.headers.get(WEBHOOK_SECRET_HEADER);
  if (!provided) return false;

  // Constant-time comparison to prevent timing attacks
  return timingSafeEqual(provided, secret);
}

/**
 * Constant-time string comparison.
 * Prevents attackers from inferring the secret character-by-character via response timing.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

// ─── In-Memory Rate Limiter ───────────────────────────────────────────────────

/**
 * Simple in-memory sliding-window rate limiter.
 *
 * NOTE: This works per-process. In multi-instance deployments (e.g., multiple
 * Vercel lambda instances), use @upstash/ratelimit backed by Redis instead.
 * For a single-instance deployment (Railway, Fly.io, VPS), this is sufficient.
 */

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

interface RateLimitOptions {
  /** Maximum number of requests allowed in the window. */
  limit: number;
  /** Window duration in milliseconds. */
  windowMs: number;
}

/**
 * Checks and increments the rate limit for a given key.
 *
 * @param key    - Unique identifier (e.g., `upload:userId`)
 * @param opts   - limit and window configuration
 * @returns true if the request is allowed, false if rate-limited
 */
export function checkRateLimit(key: string, opts: RateLimitOptions): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now - entry.windowStart > opts.windowMs) {
    // New window
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= opts.limit) return false;

  entry.count += 1;
  return true;
}

// ─── Rate limit presets (single source of truth) ─────────────────────────────

export const RATE_LIMITS = {
  upload:     { limit: 20, windowMs: 60_000 },        // 20 uploads/min
  generate:   { limit: 5,  windowMs: 60_000 },        // 5 generations/min
  clone:      { limit: 3,  windowMs: 60_000 },        // 3 clones/min
  multiClone: { limit: 1,  windowMs: 120_000 },       // 1 multi-clone/2min
  ad:         { limit: 2,  windowMs: 120_000 },       // 2 ad videos/2min
  auth:       { limit: 10, windowMs: 60_000 },        // 10 login attempts/min
  contact:    { limit: 2,  windowMs: 30 * 60_000 },   // 2 messages/30min — anti-spam
} as const;

// ─── IP Rate Limiter (Edge-compatible) ───────────────────────────────────────

/**
 * In-memory IP rate limiter for use in Next.js middleware.
 * Designed for Edge runtime — uses only Web APIs.
 *
 * Limits:
 *  - Auth endpoints (/api/auth/*, /login, /register): 20 req/min per IP
 *  - General API (/api/*): 120 req/min per IP
 *  - Pages: 300 req/min per IP
 *
 * NOTE: In-memory — resets on cold start. Use Upstash Redis for persistent
 * distributed rate limiting across Vercel instances (Step 6 of security plan).
 */

interface IpRateLimitEntry {
  count: number;
  windowStart: number;
}

const ipRateLimitStore = new Map<string, IpRateLimitEntry>();

type IpRoute = "auth" | "api" | "page";

const IP_LIMITS: Record<IpRoute, { limit: number; windowMs: number }> = {
  auth: { limit: 20,  windowMs: 60_000 },  // Strict: 20 auth requests/min/IP
  api:  { limit: 120, windowMs: 60_000 },  // Moderate: 120 API requests/min/IP
  page: { limit: 300, windowMs: 60_000 },  // Loose: 300 page loads/min/IP
};

/**
 * Classifies a pathname to determine which rate limit tier applies.
 */
function classifyPath(pathname: string): IpRoute {
  if (
    pathname.startsWith("/api/auth") ||
    pathname === "/login" ||
    pathname === "/register"
  ) return "auth";
  if (pathname.startsWith("/api")) return "api";
  return "page";
}

/**
 * Extracts the real client IP from common proxy headers.
 * Works with Vercel, Cloudflare, and direct connections.
 */
export function getClientIp(req: { headers: { get(name: string): string | null } }): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    (forwarded ? forwarded.split(",")[0]?.trim() ?? null : null) ??
    "unknown"
  );
}

/**
 * Checks the IP rate limit for a given request.
 * Returns true if the request is allowed, false if rate-limited.
 */
export function checkIpRateLimit(ip: string, pathname: string): boolean {
  if (ip === "unknown" || ip === "::1" || ip === "127.0.0.1") return true; // Skip localhost

  const tier = classifyPath(pathname);
  const { limit, windowMs } = IP_LIMITS[tier];
  const key = `${tier}:${ip}`;
  const now = Date.now();

  const entry = ipRateLimitStore.get(key);

  if (!entry || now - entry.windowStart > windowMs) {
    ipRateLimitStore.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= limit) return false;

  entry.count += 1;
  return true;
}
