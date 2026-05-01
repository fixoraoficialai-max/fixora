import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// ─── Redis Client ─────────────────────────────────────────────────────────────

/**
 * Singleton Upstash Redis client.
 * Uses REST API — works in Edge, Node.js, and serverless environments.
 * Falls back gracefully when env vars are not set (e.g., local development).
 */
function createRedisClient(): Redis | null {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    if (process.env.NODE_ENV === "production") {
      console.error("[redis] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is not set in production!");
    }
    return null;
  }

  return new Redis({ url, token });
}

const redis = createRedisClient();

// ─── Rate Limiters ────────────────────────────────────────────────────────────

/**
 * Creates a sliding window rate limiter backed by Upstash Redis.
 * Sliding window is preferred over fixed window to prevent burst attacks
 * at window boundaries.
 *
 * Returns null when Redis is unavailable — callers must handle graceful fallback.
 */
function createLimiter(limit: number, windowMs: number): Ratelimit | null {
  if (!redis) return null;

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowMs}ms`),
    analytics: false, // Disable analytics to stay in free tier
    prefix: "@fixora/rl",
  });
}

// One limiter per traffic tier — same thresholds as the middleware in-memory store
const limiters = {
  auth: createLimiter(20,  60_000),  // 20 req/min — login, register, verify
  api:  createLimiter(120, 60_000),  // 120 req/min — general API
  page: createLimiter(300, 60_000),  // 300 req/min — page loads
} as const;

type Tier = keyof typeof limiters;

// ─── Public API ───────────────────────────────────────────────────────────────

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix timestamp ms
}

/**
 * Checks the Redis-backed rate limit for a given IP and traffic tier.
 *
 * Fallback: if Redis is unavailable, ALLOWS the request (fail open).
 * This is intentional — a Redis outage should not take down the site.
 * The middleware in-memory store acts as a secondary guard during outages.
 */
export async function checkRedisRateLimit(
  ip: string,
  tier: Tier
): Promise<RateLimitResult> {
  const limiter = limiters[tier];

  // Fail open — Redis unavailable (local dev or outage)
  if (!limiter) return { allowed: true, remaining: 999, resetAt: 0 };

  const { success, remaining, reset } = await limiter.limit(ip);

  return {
    allowed:   success,
    remaining: remaining,
    resetAt:   reset,
  };
}

/** Classifies a URL pathname into a rate limit tier. */
export function classifyTier(pathname: string): Tier {
  if (
    pathname.startsWith("/api/auth") ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/verify-email"
  ) return "auth";

  if (pathname.startsWith("/api")) return "api";

  return "page";
}
