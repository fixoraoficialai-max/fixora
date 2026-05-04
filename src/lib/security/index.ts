/**
 * Central security module.
 * Every security primitive lives here — import from this file, never inline.
 *
 * Rules:
 *  - Each function does exactly ONE thing.
 *  - No side-effects outside their documented purpose.
 *  - All functions are pure and throw on invalid state.
 */

import { type NextRequest } from "next/server";
import { ApiErrors } from "@/lib/api/response";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";


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

/**
 * Verifies a Fal.ai webhook request using HMAC-SHA256.
 *
 * Fal.ai signs the raw request body with HMAC-SHA256 (key = FAL_WEBHOOK_SECRET)
 * and sends the hex-encoded digest in the `x-fal-signature` header.
 *
 * We must:
 *  1. Read the raw body BEFORE JSON parsing (caller's responsibility).
 *  2. Recompute the expected MAC.
 *  3. Compare via constant-time to prevent timing attacks.
 *
 * @param rawBody   - The raw request body string (read via `req.text()`)
 * @param signature - The value of the `x-fal-signature` header
 */
export async function verifyFalWebhookHmac(rawBody: string, signature: string | null): Promise<boolean> {
  const secret = process.env.FAL_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[security] FAL_WEBHOOK_SECRET is not set — rejecting all webhooks");
    return false;
  }

  if (!signature) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(rawBody),
  );

  const expected = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return timingSafeEqual(signature, expected);
}

/**
 * Constant-time string comparison — prevents timing-based secret inference.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

// ─── Rate Limiter (Redis-backed, in-memory fallback) ─────────────────────────

interface RateLimitOptions {
  /** Maximum number of requests allowed in the window. */
  limit: number;
  /** Window duration in milliseconds. */
  windowMs: number;
}

// ── In-memory fallback (per-process) ─────────────────────────────────────────

interface RateLimitEntry { count: number; windowStart: number; }
const rateLimitStore = new Map<string, RateLimitEntry>();

function rateLimitInMemory(key: string, opts: RateLimitOptions): boolean {
  const now   = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now - entry.windowStart > opts.windowMs) {
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= opts.limit) return false;
  entry.count += 1;
  return true;
}

// ── Redis limiters (sliding window, distributed across all instances) ─────────

let _redis: Redis | null | undefined;
function getRedis(): Redis | null {
  if (_redis !== undefined) return _redis;
  try {
    const url   = process.env.UPSTASH_REDIS_REST_URL?.trim();
    const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
    _redis = (url && token) ? new Redis({ url, token }) : null;
  } catch {
    _redis = null;
  }
  return _redis;
}

const redisLimiters = new Map<string, Ratelimit | null>();

function getRedisLimiter(limit: number, windowMs: number): Ratelimit | null {
  const mapKey = `${limit}:${windowMs}`;
  if (redisLimiters.has(mapKey)) return redisLimiters.get(mapKey) ?? null;

  const redis = getRedis();
  if (!redis) {
    redisLimiters.set(mapKey, null);
    return null;
  }

  const limiter = new Ratelimit({
    redis:     redis,
    limiter:   Ratelimit.slidingWindow(limit, `${windowMs}ms`),
    analytics: false,
    prefix:    "@fixora/user-rl",
  });

  redisLimiters.set(mapKey, limiter);
  return limiter;
}

/**
 * Checks the per-user rate limit for a given key.
 *
 * Primary: Upstash Redis sliding window (works across all Vercel instances).
 * Fallback: in-memory sliding window (used when Redis is unavailable).
 *
 * @param key   - Scoped identifier, e.g. `generate:userId`
 * @param opts  - limit and windowMs configuration
 * @returns true if the request is allowed, false if rate-limited
 */
export async function checkRateLimit(key: string, opts: RateLimitOptions): Promise<boolean> {
  const limiter = getRedisLimiter(opts.limit, opts.windowMs);

  if (limiter) {
    try {
      const { success } = await limiter.limit(key);
      return success;
    } catch {
      // Redis failure → degrade gracefully to in-memory
    }
  }

  return rateLimitInMemory(key, opts);
}

// ─── Rate limit presets (single source of truth) ─────────────────────────────

export const RATE_LIMITS = {
  upload:         { limit: 20, windowMs: 60_000        },  // 20 uploads/min
  generate:       { limit: 5,  windowMs: 60_000        },  // 5 video generations/min
  image:          { limit: 10, windowMs: 60_000        },  // 10 image generations/min
  wizardVideo:    { limit: 2,  windowMs: 120_000       },  // 2 wizard videos/2min
  clone:          { limit: 3,  windowMs: 60_000        },  // 3 clones/min
  multiClone:     { limit: 1,  windowMs: 120_000       },  // 1 multi-clone/2min
  ad:             { limit: 2,  windowMs: 120_000       },  // 2 ad videos/2min
  studio:         { limit: 3,  windowMs: 60_000        },  // 3 scene generations/min
  auth:           { limit: 10, windowMs: 60_000        },  // 10 login attempts/min
  contact:        { limit: 2,  windowMs: 30 * 60_000   },  // 2 messages/30min — anti-spam
  forgotPassword: { limit: 3,  windowMs: 15 * 60_000   },  // 3 resets/15min — email abuse guard
  prompt:         { limit: 5,  windowMs: 60_000        },  // 5 prompt optimizations/min
  userProfile:    { limit: 20, windowMs: 60_000        },  // 20 profile updates/min
  userPassword:   { limit: 5,  windowMs: 60_000        },  // 5 password changes/min — bcrypt DoS guard
  exploded:       { limit: 5,  windowMs: 60_000        },  // 5 product analyses/min
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
