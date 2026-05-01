import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { ApiErrors } from "@/lib/api/response";
import { assertAllowedProxyUrl, checkRateLimit, RATE_LIMITS } from "@/lib/security";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();

  // ── Rate limit: 20 req/min per user ──────────────────────────────────────
  const allowed = checkRateLimit(`download:${session.user.id}`, RATE_LIMITS.upload);
  if (!allowed) return ApiErrors.tooManyRequests();

  // ── SSRF Guard: only allow trusted Fal.ai storage domains ────────────────
  const rawUrl = req.nextUrl.searchParams.get("url");
  const urlOrError = assertAllowedProxyUrl(rawUrl);

  // assertAllowedProxyUrl returns a URL on success, or a NextResponse on failure
  if (!(urlOrError instanceof URL)) return urlOrError;

  const type = req.nextUrl.searchParams.get("type") ?? "image";
  const stream = req.nextUrl.searchParams.get("stream") === "1";

  // ── Fetch from trusted domain only ───────────────────────────────────────
  let response: Response;
  try {
    response = await fetch(urlOrError.toString());
  } catch {
    return NextResponse.json({ error: "Failed to reach storage server" }, { status: 502 });
  }

  if (!response.ok) {
    return NextResponse.json({ error: "File not found in storage" }, { status: 404 });
  }

  const buffer = await response.arrayBuffer();
  const contentType = type === "video"
    ? "video/mp4"
    : (response.headers.get("content-type") ?? "image/jpeg");
  const ext = type === "video" ? "mp4" : contentType.includes("png") ? "png" : "jpg";

  const headers: Record<string, string> = {
    "Content-Type": contentType,
    // Restrict CORS to same origin — no need for * since this is a server proxy
    "Access-Control-Allow-Origin": process.env.NEXT_PUBLIC_APP_URL ?? "",
  };

  if (!stream) {
    headers["Content-Disposition"] = `attachment; filename="fixora-${type}.${ext}"`;
  }

  return new NextResponse(buffer, { headers });
}
