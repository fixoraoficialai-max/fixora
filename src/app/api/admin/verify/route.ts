import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { ApiErrors } from "@/lib/api/response";
import { adminPinSchema } from "@/lib/validations/admin-pin";
import {
  getAttempts,
  isLockedOut,
  remainingLockMs,
  recordFailure,
  clearAttempts,
  createAdminToken,
  ADMIN_PIN_CONFIG,
} from "@/lib/security/admin-pin";

const COOKIE_NAME     = "admin_verified";
const COOKIE_MAX_AGE  = 4 * 60 * 60; // 4 hours in seconds

// ─── reCAPTCHA verification ───────────────────────────────────────────────────

async function verifyRecaptcha(token: string): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) return true; // Skip if not configured
  try {
    const res  = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    `secret=${secret}&response=${token}`,
    });
    const data = await res.json() as { success: boolean };
    return data.success;
  } catch {
    return false;
  }
}

// ─── Cookie signing secret ────────────────────────────────────────────────────

function cookieSecret(): string {
  // AUTH_SECRET is the NextAuth v5 variable name (NEXTAUTH_SECRET is v4 — not used here)
  return (process.env.AUTH_SECRET ?? "") + (process.env.ADMIN_PIN ?? "");
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Auth — must be logged in as ADMIN
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();
  if ((session.user as { role?: string }).role !== "ADMIN") return ApiErrors.forbidden();

  const userId = session.user.id;

  // 2. Check lockout
  const record = await getAttempts(userId);
  if (isLockedOut(record)) {
    return NextResponse.json(
      { success: false, locked: true, remainingMs: remainingLockMs(record) },
      { status: 429 }
    );
  }

  // 3. Parse + validate body
  let body: unknown;
  try { body = await req.json(); }
  catch { return ApiErrors.validation({ message: "Invalid JSON" }); }

  const parsed = adminPinSchema.safeParse(body);
  if (!parsed.success) return ApiErrors.validation(parsed.error.flatten().fieldErrors);

  const { pin, recaptchaToken } = parsed.data;

  // 4. Require reCAPTCHA after threshold
  if (record.count >= ADMIN_PIN_CONFIG.recaptchaThreshold) {
    if (!recaptchaToken) {
      return NextResponse.json(
        { success: false, requireRecaptcha: true, attempts: record.count },
        { status: 400 }
      );
    }
    const valid = await verifyRecaptcha(recaptchaToken);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: "reCAPTCHA inválido. Inténtalo de nuevo." },
        { status: 400 }
      );
    }
  }

  // 5. Validate PIN — constant-time safe (both strings same type, Zod already validated length)
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) {
    return ApiErrors.internal();
  }

  if (pin !== adminPin) {
    const updated    = await recordFailure(userId);
    const nowLocked  = isLockedOut(updated);
    return NextResponse.json(
      {
        success:          false,
        locked:           nowLocked,
        remainingMs:      nowLocked ? remainingLockMs(updated) : 0,
        attempts:         updated.count,
        attemptsLeft:     ADMIN_PIN_CONFIG.maxAttempts - updated.count,
        requireRecaptcha: updated.count >= ADMIN_PIN_CONFIG.recaptchaThreshold,
      },
      { status: 401 }
    );
  }

  // 6. PIN correct — issue signed cookie
  await clearAttempts(userId);
  const token = await createAdminToken(userId, cookieSecret());

  const response = NextResponse.json({ success: true, data: { ok: true } });
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge:   COOKIE_MAX_AGE,
    path:     "/admin",
  });
  return response;
}
