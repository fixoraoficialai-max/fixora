/**
 * Admin PIN security module.
 * Single responsibility: track failed attempts and sign/verify session tokens.
 * In-memory — resets on cold start (intentional: extra security layer).
 */

// ─── Attempt Tracking ─────────────────────────────────────────────────────────

interface AttemptRecord {
  count: number;
  lockedUntil: number | null;
}

const store = new Map<string, AttemptRecord>();

export const ADMIN_PIN_CONFIG = {
  maxAttempts:        5,
  recaptchaThreshold: 2,      // Show reCAPTCHA after N failures
  lockDurationMs:     60_000, // 1 minute lockout (iPhone-style)
  minLength:          15,
  maxLength:          30,
} as const;

export function getAttempts(userId: string): AttemptRecord {
  return store.get(userId) ?? { count: 0, lockedUntil: null };
}

export function isLockedOut(record: AttemptRecord): boolean {
  return !!record.lockedUntil && Date.now() < record.lockedUntil;
}

export function remainingLockMs(record: AttemptRecord): number {
  if (!record.lockedUntil) return 0;
  return Math.max(0, record.lockedUntil - Date.now());
}

export function recordFailure(userId: string): AttemptRecord {
  const prev  = getAttempts(userId);
  const count = prev.count + 1;
  const lockedUntil = count >= ADMIN_PIN_CONFIG.maxAttempts
    ? Date.now() + ADMIN_PIN_CONFIG.lockDurationMs
    : null;
  const next = { count, lockedUntil };
  store.set(userId, next);
  return next;
}

export function clearAttempts(userId: string): void {
  store.delete(userId);
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

/**
 * Creates a signed admin session token valid for 4 hours.
 * Secret = NEXTAUTH_SECRET + ADMIN_PIN (both must be known to forge).
 */
export async function createAdminToken(userId: string, secret: string): Promise<string> {
  const expires = Math.floor(Date.now() / 1000) + 4 * 60 * 60;
  const payload = `${userId}:${expires}`;
  const key = await hmacKey(secret, "sign");
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload).buffer as ArrayBuffer);
  return `${payload}:${toHex(sig)}`;
}

/**
 * Verifies a signed admin session token.
 * Returns false for any invalid, expired, or forged token — never throws.
 */
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
