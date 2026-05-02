/**
 * Email HTML templates — Fixora Video
 *
 * Rules:
 * - All styles are INLINE (email clients strip <style> tags).
 * - Table-based layout for maximum Gmail/Outlook/Apple Mail compatibility.
 * - Each exported function has a single responsibility: produce one email type.
 * - No external assets (no images via URL — they get blocked by email clients).
 */

// ─── Brand tokens ─────────────────────────────────────────────────────────────

const APP_NAME    = "Fixora Video";
const APP_URL     = "https://fixoravideo.com";
const SUPPORT_EMAIL = "support@fixoravideo.com";

const COLORS = {
  bg:         "#0a0a0a",
  cardBg:     "#141414",
  cardBorder: "#232323",
  headerBg:   "#111111",
  violet:     "#7c3aed",
  violetLight:"#a78bfa",
  blue:       "#6366f1",
  white:      "#ffffff",
  textPrimary:"#f1f1f1",
  textMuted:  "#888888",
  textFaint:  "#444444",
  divider:    "#1e1e1e",
} as const;

// ─── Shared shell ─────────────────────────────────────────────────────────────

/**
 * Wraps body content in a full, responsive HTML email shell.
 * Single responsibility: provide the outer layout and branding header/footer.
 */
function emailShell(content: string, footerNote?: string): string {
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${APP_NAME}</title>
</head>
<body style="margin:0;padding:0;background-color:${COLORS.bg};-webkit-font-smoothing:antialiased;">

  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
    style="background-color:${COLORS.bg};padding:48px 16px;">
    <tr><td align="center">

      <!-- Inner container: max 560px -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
        style="max-width:560px;width:100%;">

        <!-- ── Header / Logo ── -->
        <tr>
          <td style="padding-bottom:28px;text-align:center;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr>
                <td style="background:linear-gradient(135deg,${COLORS.violet},${COLORS.blue});
                            width:36px;height:36px;border-radius:10px;text-align:center;
                            vertical-align:middle;">
                  <span style="font-size:16px;font-weight:800;color:${COLORS.white};
                               font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
                               line-height:36px;display:inline-block;width:36px;text-align:center;">FV</span>
                </td>
                <td style="padding-left:10px;vertical-align:middle;">
                  <span style="font-size:20px;font-weight:700;color:${COLORS.white};
                               font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
                               letter-spacing:-0.3px;">Fixora</span>
                  <span style="font-size:20px;font-weight:700;color:${COLORS.violetLight};
                               font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
                               letter-spacing:-0.3px;"> Video</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── Card ── -->
        <tr>
          <td style="background-color:${COLORS.cardBg};border:1px solid ${COLORS.cardBorder};
                     border-radius:16px;overflow:hidden;">

            <!-- Card top accent bar -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="height:4px;background:linear-gradient(90deg,${COLORS.violet},${COLORS.blue},${COLORS.violetLight});"></td>
              </tr>
            </table>

            <!-- Card body -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:40px 40px 36px;">
                  ${content}
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- ── Footer ── -->
        <tr>
          <td style="padding-top:28px;text-align:center;">
            <p style="margin:0 0 6px;color:${COLORS.textFaint};font-size:12px;line-height:1.7;
                       font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
              ${footerNote ?? `You're receiving this email because you have an account on ${APP_NAME}.`}
            </p>
            <p style="margin:0 0 12px;color:${COLORS.textFaint};font-size:12px;
                       font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
              If you didn't request this, you can safely ignore it.
            </p>
            <p style="margin:0;color:${COLORS.textFaint};font-size:11px;
                       font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
              © ${year} ${APP_NAME} ·
              <a href="${APP_URL}" style="color:${COLORS.textFaint};text-decoration:underline;">fixoravideo.com</a>
              · <a href="mailto:${SUPPORT_EMAIL}" style="color:${COLORS.textFaint};text-decoration:underline;">Support</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>

</body>
</html>`;
}

// ─── Shared sub-components ────────────────────────────────────────────────────

/** Renders the primary CTA button. */
function primaryButton(label: string, url: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px 0;">
      <tr>
        <td style="border-radius:10px;background:linear-gradient(135deg,${COLORS.violet},${COLORS.blue});">
          <a href="${url}"
             style="display:inline-block;padding:15px 36px;color:${COLORS.white};text-decoration:none;
                    font-weight:700;font-size:15px;letter-spacing:0.2px;border-radius:10px;
                    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            ${label}
          </a>
        </td>
      </tr>
    </table>`;
}

/** Renders the "copy link" fallback section. */
function copyLinkSection(url: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
      style="margin-top:24px;border-top:1px solid ${COLORS.divider};">
      <tr>
        <td style="padding-top:20px;">
          <p style="margin:0 0 8px;font-size:12px;color:${COLORS.textMuted};
                     font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            Button not working? Copy and paste this link into your browser:
          </p>
          <p style="margin:0;font-size:12px;word-break:break-all;color:${COLORS.violetLight};
                     font-family:monospace;">
            ${url}
          </p>
        </td>
      </tr>
    </table>`;
}

// ─── Email templates ──────────────────────────────────────────────────────────

/**
 * Email sent after registration to verify the user's email address.
 * @param verifyUrl - Full one-time verification URL.
 * @param userName  - Optional display name for personalization.
 */
export function buildVerificationEmail(verifyUrl: string, userName?: string): string {
  const greeting = userName ? `Hi ${userName},` : "Hi there,";

  return emailShell(
    `
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:${COLORS.violetLight};
               letter-spacing:1px;text-transform:uppercase;
               font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      Email Verification
    </p>

    <h1 style="margin:8px 0 0;font-size:26px;font-weight:800;color:${COLORS.textPrimary};
               letter-spacing:-0.5px;line-height:1.2;
               font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      Confirm your email address
    </h1>

    <p style="margin:16px 0 0;font-size:15px;color:${COLORS.textMuted};line-height:1.7;
               font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      ${greeting} Welcome to <strong style="color:${COLORS.textPrimary};">${APP_NAME}</strong>!
      Please verify your email address to activate your account and start creating AI videos.
    </p>

    <p style="margin:8px 0 0;font-size:14px;color:${COLORS.textMuted};
               font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      This link expires in <strong style="color:${COLORS.textPrimary};">24 hours</strong>.
    </p>

    ${primaryButton("Verify my email address", verifyUrl)}

    <!-- Security note -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
      style="background:rgba(124,58,237,0.08);border:1px solid rgba(124,58,237,0.2);
             border-radius:8px;margin-top:4px;">
      <tr>
        <td style="padding:14px 16px;">
          <p style="margin:0;font-size:13px;color:${COLORS.textMuted};line-height:1.6;
                     font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            🔒 <strong style="color:${COLORS.textPrimary};">Security note:</strong>
            We will never ask for your password via email. This link is unique to you and expires in 24 hours.
          </p>
        </td>
      </tr>
    </table>

    ${copyLinkSection(verifyUrl)}
    `,
    `You're receiving this because you recently created a ${APP_NAME} account.`
  );
}

/**
 * Email sent when a user requests a password reset.
 * @param resetUrl - Full one-time reset URL (with token).
 * @param userName - Optional display name for personalization.
 */
export function buildPasswordResetEmail(resetUrl: string, userName?: string): string {
  const greeting = userName ? `Hi ${userName},` : "Hi there,";

  return emailShell(
    `
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:${COLORS.violetLight};
               letter-spacing:1px;text-transform:uppercase;
               font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      Password Reset
    </p>

    <h1 style="margin:8px 0 0;font-size:26px;font-weight:800;color:${COLORS.textPrimary};
               letter-spacing:-0.5px;line-height:1.2;
               font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      Reset your password
    </h1>

    <p style="margin:16px 0 0;font-size:15px;color:${COLORS.textMuted};line-height:1.7;
               font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      ${greeting} We received a request to reset the password for your
      <strong style="color:${COLORS.textPrimary};">${APP_NAME}</strong> account.
      Click the button below to choose a new password.
    </p>

    <p style="margin:8px 0 0;font-size:14px;color:${COLORS.textMuted};
               font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      This link expires in <strong style="color:${COLORS.textPrimary};">1 hour</strong> for your security.
    </p>

    ${primaryButton("Reset my password", resetUrl)}

    <!-- Security warning -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
      style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.15);
             border-radius:8px;margin-top:4px;">
      <tr>
        <td style="padding:14px 16px;">
          <p style="margin:0;font-size:13px;color:${COLORS.textMuted};line-height:1.6;
                     font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            ⚠️ <strong style="color:${COLORS.textPrimary};">Didn't request this?</strong>
            If you did not request a password reset, please ignore this email.
            Your password will remain unchanged and your account is safe.
          </p>
        </td>
      </tr>
    </table>

    ${copyLinkSection(resetUrl)}
    `,
    `You're receiving this because a password reset was requested for your ${APP_NAME} account.`
  );
}

/**
 * Email sent when a user's credit balance drops to a low threshold.
 * @param userName      - Display name for personalization.
 * @param balance       - Current credit balance.
 * @param settingsUrl   - Link to the settings/upgrade page.
 */
export function buildLowCreditsEmail(
  userName: string | null,
  balance: number,
  settingsUrl: string
): string {
  const greeting  = userName ? `Hi ${userName},` : "Hi there,";
  const isCritical = balance === 0;

  const accentColor  = isCritical ? "#ef4444" : "#f59e0b";
  const accentLight  = isCritical ? "rgba(239,68,68,0.08)"  : "rgba(245,158,11,0.08)";
  const accentBorder = isCritical ? "rgba(239,68,68,0.20)"  : "rgba(245,158,11,0.20)";
  const emoji        = isCritical ? "🚨" : "⚡";
  const label        = isCritical ? "Out of Credits" : "Low Credits Warning";
  const headline     = isCritical
    ? "You've used all your credits"
    : "You're running low on credits";
  const body         = isCritical
    ? `${greeting} You have <strong style="color:${accentColor};">0 credits</strong> remaining on your ${APP_NAME} account. Video generation is paused until you add more credits.`
    : `${greeting} You have <strong style="color:${accentColor};">${balance} credit${balance === 1 ? "" : "s"}</strong> remaining — that's enough for ${Math.floor(balance / 5)} more basic video${Math.floor(balance / 5) === 1 ? "" : "s"}. Top up to keep creating without interruption.`;

  return emailShell(
    `
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:${accentColor};
               letter-spacing:1px;text-transform:uppercase;
               font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      ${emoji} ${label}
    </p>

    <h1 style="margin:8px 0 0;font-size:26px;font-weight:800;color:${COLORS.textPrimary};
               letter-spacing:-0.5px;line-height:1.2;
               font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      ${headline}
    </h1>

    <p style="margin:16px 0 0;font-size:15px;color:${COLORS.textMuted};line-height:1.7;
               font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      ${body}
    </p>

    <!-- Credit balance indicator -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
      style="background:${accentLight};border:1px solid ${accentBorder};
             border-radius:10px;margin:24px 0 0;">
      <tr>
        <td style="padding:18px 20px;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:${accentColor};
                     letter-spacing:0.5px;text-transform:uppercase;
                     font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            Current balance
          </p>
          <p style="margin:0;font-size:32px;font-weight:800;color:${COLORS.textPrimary};
                     font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
                     letter-spacing:-1px;">
            ${balance} <span style="font-size:16px;font-weight:500;color:${COLORS.textMuted};">credits</span>
          </p>
        </td>
      </tr>
    </table>

    ${primaryButton("Upgrade my plan", settingsUrl)}

    <p style="margin:0;font-size:13px;color:${COLORS.textMuted};line-height:1.6;
               font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      Our plans start at <strong style="color:${COLORS.textPrimary};">$12/month</strong> for 80 credits.
      You can also upgrade anytime from your account settings.
    </p>
    `,
    `You're receiving this because your ${APP_NAME} credit balance is running low.`
  );
}

