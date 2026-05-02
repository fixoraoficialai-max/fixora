import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { sendEmail } from "@/lib/email";
import { ApiErrors, apiSuccess } from "@/lib/api/response";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security";
import { contactSchema } from "@/lib/validations/contact";

// ─── Email builder ────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  sugerencia: "💡 Sugerencia",
  reclamo:    "🚨 Reclamo",
  idea:       "✨ Idea",
  bug:        "🐛 Bug",
};

function buildContactEmail(opts: {
  userName: string;
  userEmail: string;
  category: string;
  message: string;
}): string {
  const label = CATEGORY_LABELS[opts.category] ?? opts.category;
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
      <h2 style="margin-bottom:4px;">${label}</h2>
      <p style="color:#666;font-size:14px;margin-top:0;">
        De: <strong>${opts.userName}</strong> (${opts.userEmail})
      </p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />
      <p style="font-size:15px;line-height:1.6;white-space:pre-wrap;">${opts.message}</p>
    </div>
  `.trim();
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Auth
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return ApiErrors.unauthorized();

  // 2. Rate limit — anti-spam
  if (!checkRateLimit(`contact:${session.user.id}`, RATE_LIMITS.contact)) {
    return ApiErrors.tooManyRequests();
  }

  // 3. Parse + validate body
  let body: unknown;
  try { body = await req.json(); }
  catch { return ApiErrors.validation({ message: "Invalid JSON body" }); }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) return ApiErrors.validation(parsed.error.flatten().fieldErrors);

  const { category, message } = parsed.data;

  // 4. Resolve admin email — must be configured in environment
  const adminEmail = process.env.ADMIN_CONTACT_EMAIL;
  if (!adminEmail) {
    console.error("[contact] ADMIN_CONTACT_EMAIL env var is not set");
    return ApiErrors.internal();
  }

  // 5. Send email
  const label = CATEGORY_LABELS[category] ?? category;
  const sent = await sendEmail({
    to:      adminEmail,
    subject: `[Fixora] ${label} — ${session.user.name ?? session.user.email}`,
    html:    buildContactEmail({
      userName:  session.user.name ?? "Usuario",
      userEmail: session.user.email,
      category,
      message,
    }),
  });

  if (!sent) return ApiErrors.internal();

  return apiSuccess({ message: "Mensaje enviado correctamente" });
}
