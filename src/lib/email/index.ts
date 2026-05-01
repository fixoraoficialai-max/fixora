import { Resend } from "resend";

/**
 * The "from" address for all transactional emails.
 * Set EMAIL_FROM in your environment to override.
 * Default uses the verified Fixora Video domain.
 */
const FROM_ADDRESS = process.env.EMAIL_FROM ?? "Fixora Video <noreply@fixoravideo.com>";

/**
 * Returns a Resend client instance on demand.
 * Lazy — not created at module load time so build-time analysis never fails.
 * Throws clearly if RESEND_API_KEY is missing at runtime.
 */
function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("[email] RESEND_API_KEY is not set. Cannot send emails.");
  }
  return new Resend(apiKey);
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends a transactional email via Resend.
 * Single responsibility: deliver one email and report success/failure.
 * Returns true on success, false on failure — never throws to the caller.
 */
export async function sendEmail(opts: SendEmailOptions): Promise<boolean> {
  try {
    const resend = getResendClient();
    const { error } = await resend.emails.send({
      from:    FROM_ADDRESS,
      to:      opts.to,
      subject: opts.subject,
      html:    opts.html,
    });

    if (error) {
      console.error("[email] Send failed:", { to: opts.to, subject: opts.subject, error });
      return false;
    }

    return true;
  } catch (err) {
    console.error("[email] Unexpected error:", err);
    return false;
  }
}
