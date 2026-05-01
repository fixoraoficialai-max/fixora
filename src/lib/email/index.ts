import { Resend } from "resend";

/** Singleton Resend client — created once, reused across all requests. */
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * The "from" address used for all transactional emails.
 * In development: uses Resend's shared domain (no DNS setup needed).
 * In production: change to your verified domain, e.g. noreply@fixora.ai
 */
const FROM_ADDRESS = process.env.EMAIL_FROM ?? "Fixora <onboarding@resend.dev>";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends a transactional email via Resend.
 * Single responsibility: deliver one email and report success/failure.
 *
 * Returns true on success, false on failure.
 * Errors are logged but never thrown — callers must check the return value.
 */
export async function sendEmail(opts: SendEmailOptions): Promise<boolean> {
  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to:   opts.to,
    subject: opts.subject,
    html: opts.html,
  });

  if (error) {
    console.error("[email] Send failed:", { to: opts.to, subject: opts.subject, error });
    return false;
  }

  return true;
}
