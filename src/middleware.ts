import { auth } from "@/lib/auth/config";
import { NextResponse, type NextRequest } from "next/server";
import { checkRedisRateLimit, classifyTier } from "@/lib/redis";

// ─── Constants ────────────────────────────────────────────────────────────────

const PROTECTED_PREFIXES = ["/dashboard", "/projects", "/history", "/settings", "/create"];
const AUTH_ROUTES        = ["/login", "/register"];

// ─── IP Extraction ────────────────────────────────────────────────────────────

/**
 * Extracts the real client IP from proxy headers.
 * Priority: Cloudflare → Nginx → Load balancer → unknown
 */
function extractIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    (forwarded ? forwarded.split(",")[0]?.trim() ?? null : null) ??
    "unknown"
  );
}

/** Returns a 429 Too Many Requests response. */
function rateLimitedResponse(limit: number): NextResponse {
  return new NextResponse(
    JSON.stringify({ success: false, error: { code: "RATE_LIMITED", message: "Too many requests" } }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After":  "60",
        "X-RateLimit-Limit": String(limit),
      },
    }
  );
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export default auth(async (req) => {
  const { nextUrl, auth: session } = req;
  const path = nextUrl.pathname;
  const ip   = extractIp(req);

  // 1. Redis Rate Limit — skip localhost in development
  if (ip !== "unknown" && ip !== "::1" && ip !== "127.0.0.1") {
    const tier   = classifyTier(path);
    const result = await checkRedisRateLimit(ip, tier);

    if (!result.allowed) {
      const limits = { auth: 20, api: 120, page: 300 };
      return rateLimitedResponse(limits[tier]);
    }
  }

  // 2. Auth guard — redirect unauthenticated users away from protected routes
  const isLoggedIn  = !!session?.user;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => path.startsWith(prefix));
  const isAuthRoute = AUTH_ROUTES.includes(path);

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)" ],
};