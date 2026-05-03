/**
 * Admin PIN security module.
 * Single responsibility: track failed attempts and sign/verify session tokens.
 *
 * Attempt tracking is Redis-backed (Upstash) so lockouts persist across all
 * Vercel instances and cold starts. Falls back to an in-memory Map when Redis
 * is unavailable (e.g. local dev without env vars).
 */

import { Redis } from "@upstash/redis";

// ─── Redis client (lazy singleton) ────────────────────────────────────────────

let _redis: Redis | null | undefined = undefined; // undefined = not yet initialized

/** Returns the Redis client, initializing it on first call. Never throws. */
function getRedis(): Redis | null {
  if (_redis !== undefined) return _redis;
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  _redis = (url && token) ? new Redis({ url, token }) : null;
  return _redis;
}

const KEY_PREFIX          = "admin:lockout:";
const NON_LOCKED_TTL_SECS = 24 * 60 * 60; // auto-clean non-locked records after 24h

function redisKey(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

// ─── Config ───────────────────────────────────────────────────────────────────

export const ADMIN_PIN_CONFIG = {
  maxAttempts:        5,
  recaptchaThreshold: 2,      // Show reCAPTCHA after N failures
  lockDurationMs:     60_000, // 1-minute lockout
  minLength:          15,
  maxLength:          30,
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AttemptRecord {
  count:       number;
  lockedUntil: number | null;
}

// ─── Pure helpers (sync — no I/O) ─────────────────────────────────────────────

export function isLockedOut(record: AttemptRecord): boolean {
  return !!record.lockedUntil && Date.now() < record.lockedUntil;
}

export function remainingLockMs(record: AttemptRecord): number {
  if (!record.lockedUntil) return 0;
  return Math.max(0, record.lockedUntil - Date.now());
}

// ─── In-memory fallback (single-instance only) ────────────────────────────────

const fallbackStore = new Map<string, AttemptRecord>();

// ─── Redis-backed attempt tracking ────────────────────────────────────────────

/** Returns the current attempt record for a user. */
export async function getAttempts(userId: string): Promise<AttemptRecord> {
  const redis = getRedis();
  if (redis) {
    try {
      const record = await redis.get<AttemptRecord>(redisKey(userId));
      return record ?? { count: 0, lockedUntil: null };
    } catch {
      // Redis unavailable — fall through to in-memory
    }
  }
  return fallbackStore.get(userId) ?? { count: 0, lockedUntil: null };
}

/** Records a failed PIN attempt and returns the updated record. */
export async function recordFailure(userId: string): Promise<AttemptRecord> {
  const prev  = await getAttempts(userId);
  const count = prev.count + 1;
  const lockedUntil = count >= ADMIN_PIN_CONFIG.maxAttempts
    ? Date.now() + ADMIN_PIN_CONFIG.lockDurationMs
    : null;
  const next: AttemptRecord = { count, lockedUntil };

  const redis = getRedis();
  if (redis) {
    try {
      // TTL: lockout duration + 60s buffer, or 24h for non-locked records
      const ttlSecs = lockedUntil
        ? Math.ceil(ADMIN_PIN_CONFIG.lockDurationMs / 1000) + 60
        : NON_LOCKED_TTL_SECS;
      await redis.set(redisKey(userId), next, { ex: ttlSecs });
      return next;
    } catch {
      // Redis unavailable — fall through to in-memory
    }
  }
  fallbackStore.set(userId, next);
  return next;
}

/** Clears all attempt records after a successful PIN entry. */
export async function clearAttempts(userId: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.del(redisKey(userId));
      return;
    } catch {
      // Redis unavailable — fall through to in-memory
    }
  }
  fallbackStore.delete(userId);
}

// ─── Token Signing (Web Crypto — works in Node + Edge) ────────────────────────

function buildSecret(base: string): ArrayBuffer {
  return new TextEncoder().encode(base).buffer as ArrayBuffer;
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array {
  const pairs = hex.match(/.{2}/g) ?? [];
  return new Uint8Array(pairs.map((b) => parseInt(b, 16)));
}

async function hmacKey(secret: string, usage: "sign" | "verify"): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    buildSecret(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage]
  );
}

/** Creates a signed admin session token valid for 4 hours. */
export async function createAdminToken(userId: string, secret: string): Promise<string> {
  const expires = Math.floor(Date.now() / 1000) + 4 * 60 * 60;
  const payload = `${userId}:${expires}`;
  const key = await hmacKey(secret, "sign");
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload).buffer as ArrayBuffer);
  return `${payload}:${toHex(sig)}`;
}

/** Verifies a signed admin session token. Returns false for any invalid/expired/forged token. */
export async function verifyAdminToken(
  token: string,
  userId: string,
  secret: string
): Promise<boolean> {
  try {
    const parts = token.split(":");
    if (parts.length !== 3) return false;

    const [tokenUserId, expiresStr, sigHex] = parts as [string, string, string];
    if (tokenUserId !== userId) return false;

    const expires = parseInt(expiresStr, 10);
    if (isNaN(expires) || Math.floor(Date.now() / 1000) > expires) return false;

    const payload = `${tokenUserId}:${expiresStr}`;
    const key     = await hmacKey(secret, "verify");
    return await crypto.subtle.verify(
      "HMAC",
      key,
      fromHex(sigHex).buffer as ArrayBuffer,
      new TextEncoder().encode(payload).buffer as ArrayBuffer
    );
  } catch {
    return false;
  }
}
