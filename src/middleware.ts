import NextAuth from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { authConfigEdge } from "@/lib/auth/config.edge";

// ─── Constants ────────────────────────────────────────────────────────────────

const PROTECTED_PREFIXES = ["/dashboard", "/projects", "/history", "/settings", "/create", "/admin", "/studio"];
const ADMIN_PREFIXES     = ["/admin"];
const AUTH_ROUTES        = ["/login", "/register"];

// ─── Lightweight in-memory rate limiter ───────────────────────────────────────
// No external deps — keeps Edge bundle small.

interface IpEntry { count: number; windowStart: number; }
const ipStore = new Map<string, IpEntry>();

const IP_LIMITS = {
  auth: { limit: 20,  windowMs: 60_000 },
  api:  { limit: 120, windowMs: 60_000 },
  page: { limit: 300, windowMs: 60_000 },
} as const;

type Tier = keyof typeof IP_LIMITS;

function getIpTier(pathname: string): Tier {
  if (
    pathname.startsWith("/api/auth") ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/verify-email"
  ) return "auth";
  if (pathname.startsWith("/api")) return "api";
  return "page";
}

function extractIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    (forwarded ? forwarded.split(",")[0]?.trim() ?? null : null) ??
    "unknown"
  );
}

function isIpAllowed(ip: string, pathname: string): boolean {
  if (ip === "unknown" || ip === "::1" || ip === "127.0.0.1") return true;

  const tier               = getIpTier(pathname);
  const { limit, windowMs } = IP_LIMITS[tier];
  const key                = `${tier}:${ip}`;
  const now                = Date.now();
  const entry              = ipStore.get(key);

  if (!entry || now - entry.windowStart > windowMs) {
    ipStore.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}

function rateLimitedResponse(tier: Tier): NextResponse {
  return new NextResponse(
    JSON.stringify({ success: false, error: { code: "RATE_LIMITED", message: "Too many requests" } }),
    {
      status: 429,
      headers: {
        "Content-Type":      "application/json",
        "Retry-After":       "60",
        "X-RateLimit-Limit": String(IP_LIMITS[tier].limit),
      },
    }
  );
}

// ─── Admin cookie verification (Web Crypto — Edge compatible) ────────────────

async function verifyAdminCookie(
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

    const payload  = `${tokenUserId}:${expiresStr}`;
    const key      = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret).buffer as ArrayBuffer,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const sigBytes = new Uint8Array(
      (sigHex.match(/.{2}/g) ?? []).map((b) => parseInt(b, 16))
    ).buffer as ArrayBuffer;
    return await crypto.subtle.verify(
      "HMAC", key, sigBytes, new TextEncoder().encode(payload).buffer as ArrayBuffer
    );
  } catch {
    return false;
  }
}

// ─── Auth instance (Edge-compatible — no Prisma, no bcrypt) ──────────────────

const { auth } = NextAuth(authConfigEdge);

// ─── Middleware ───────────────────────────────────────────────────────────────

export default auth(async (req) => {
  const { nextUrl, auth: session } = req;
  const path = nextUrl.pathname;
  const ip   = extractIp(req);

  // 1. Rate limit
  if (!isIpAllowed(ip, path)) {
    return rateLimitedResponse(getIpTier(path));
  }

  // 2. Auth guard
  const isLoggedIn  = !!session?.user;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => path.startsWith(prefix));
  const isAuthRoute = AUTH_ROUTES.includes(path);

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl);
  }

  // Admin guard — layer 1: role in JWT token
  const isAdminRoute = ADMIN_PREFIXES.some((prefix) => path.startsWith(prefix));
  if (isAdminRoute && isLoggedIn) {
    const role = (session as { user?: { role?: string } })?.user?.role;
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", nextUrl.origin));
    }

    // Layer 2: Admin PIN cookie — skip only for the verify page itself
    if (path !== "/admin/verify") {
      const userId      = (session as { user?: { id?: string } })?.user?.id ?? "";
      const cookieValue = req.cookies.get("admin_verified")?.value ?? "";
      const secret      = (process.env.NEXTAUTH_SECRET ?? "") + (process.env.ADMIN_PIN ?? "");
      const valid       = await verifyAdminCookie(cookieValue, userId, secret);
      if (!valid) {
        return NextResponse.redirect(new URL("/admin/verify", nextUrl.origin));
      }
    }
  }

  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|api/auth|.*\\..*).*)"],
};