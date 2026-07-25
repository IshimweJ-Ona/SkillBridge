// One shared branded HTML shell for every outgoing SkillBridge email, so
// every notification type (OTP, password reset, job matches, badges,
// disputes, admin alerts, ...) looks consistent without duplicating a full
// HTML document at each call site. Deliberately a light background with the
// brand red as an accent (not the app's dark theme) - email clients handle
// light templates far more predictably across "dark mode" rendering quirks
// than a near-black background does.
//
// Table-based layout + inline styles throughout: required for consistent
// rendering across email clients (Outlook in particular ignores <style>
// blocks and most CSS layout properties).

const BRAND_RED = '#e4293f';
const BRAND_RED_DARK = '#c01f33';
const TEXT_DARK = '#18181b';
const TEXT_MUTED = '#52525b';
const BORDER = '#e4e4e7';
const BG = '#f4f4f5';

export type EmailTemplateOptions = {
  /** Short, specific heading - this is the first thing read after the subject line. */
  heading: string;
  /** One or more paragraphs of body text, rendered in order. */
  paragraphs: string[];
  /** A short code/token to display large and centered (e.g. an OTP). */
  highlight?: string;
  /** A single primary action button. */
  cta?: { label: string; url: string };
  /** Overrides the default "you're getting this because..." footer line. */
  footerNote?: string;
};

export function renderBrandedEmail({
  heading,
  paragraphs,
  highlight,
  cta,
  footerNote,
}: EmailTemplateOptions): string {
  const paragraphHtml = paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${TEXT_DARK};">${escapeHtml(paragraph)}</p>`,
    )
    .join('');

  const highlightHtml = highlight
    ? `<div style="margin:8px 0 24px;padding:16px 24px;background:#fef2f3;border:1px solid ${BRAND_RED};border-radius:8px;text-align:center;">
        <span style="font-size:28px;font-weight:700;letter-spacing:6px;color:${BRAND_RED_DARK};font-family:'Courier New',Courier,monospace;">${escapeHtml(highlight)}</span>
      </div>`
    : '';

  const ctaHtml = cta
    ? `<div style="margin:8px 0 28px;text-align:center;">
        <a href="${escapeAttr(cta.url)}" style="display:inline-block;padding:12px 28px;background:${BRAND_RED};color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;border-radius:6px;">${escapeHtml(cta.label)}</a>
      </div>`
    : '';

  const footer =
    footerNote ??
    "You're receiving this because you have a SkillBridge account. If this wasn't you, you can safely ignore this email.";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(heading)}</title>
  </head>
  <body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid ${BORDER};">
            <tr>
              <td style="background:${BRAND_RED};padding:20px 32px;">
                <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.5px;">SkillBridge</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;font-weight:700;color:${TEXT_DARK};">${escapeHtml(heading)}</h1>
                ${paragraphHtml}
                ${highlightHtml}
                ${ctaHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;border-top:1px solid ${BORDER};">
                <p style="margin:0;font-size:12px;line-height:1.5;color:${TEXT_MUTED};">${escapeHtml(footer)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(input: string): string {
  return escapeHtml(input);
}
