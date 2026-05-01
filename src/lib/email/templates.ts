/**
 * Email HTML templates.
 * Each function returns a complete, self-contained HTML string.
 * Single responsibility: produce the markup for one specific email type.
 */

const APP_NAME = "Fixora";
const BRAND_COLOR = "#7c3aed"; // Violet-600 — matches the app's primary color

/** Wraps content in a consistent branded shell. */
function emailShell(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${APP_NAME}</title>
</head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <!-- Logo -->
        <tr><td style="padding-bottom:32px;text-align:center;">
          <span style="font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">${APP_NAME}</span>
        </td></tr>
        <!-- Card -->
        <tr><td style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:40px 36px;">
          ${content}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding-top:24px;text-align:center;">
          <p style="margin:0;color:#555;font-size:12px;">
            You received this email because you signed up for ${APP_NAME}.<br/>
            If you didn't create an account, you can safely ignore this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Generates the email verification HTML.
 * @param verifyUrl - The full URL including the one-time token.
 */
export function buildVerificationEmail(verifyUrl: string): string {
  return emailShell(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;">
      Verify your email
    </h1>
    <p style="margin:0 0 32px;color:#888;font-size:15px;line-height:1.6;">
      Click the button below to verify your email address and activate your ${APP_NAME} account.
      This link expires in <strong style="color:#aaa;">24 hours</strong>.
    </p>
    <a href="${verifyUrl}"
       style="display:inline-block;background:${BRAND_COLOR};color:#ffffff;text-decoration:none;
              font-weight:600;font-size:15px;padding:14px 32px;border-radius:8px;">
      Verify Email Address
    </a>
    <p style="margin:28px 0 0;color:#555;font-size:13px;">
      Or copy this link into your browser:<br/>
      <span style="color:#7c5fe6;word-break:break-all;">${verifyUrl}</span>
    </p>
  `);
}
