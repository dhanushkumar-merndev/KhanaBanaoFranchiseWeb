import { site } from "@/lib/site";

/**
 * Branded chrome for every outgoing email.
 *
 * The chrome lives here rather than in the stored templates on purpose: an
 * admin editing a template in /admin/email-templates writes plain content HTML
 * (`<p>`, `<strong>`, a link, a button) and cannot accidentally break the
 * header, the logo or the footer. One change here restyles all sixteen mails.
 *
 * Written to the constraints of real mail clients: table layout, inline styles,
 * no external CSS or web fonts. The logo is stored in Brevo's image gallery so
 * mail clients load it from Brevo's stable image CDN rather than the branded
 * tracking hostname used to rewrite images hosted on the application domain.
 */

const MAROON = "#8e1218";
const CRIMSON = "#c1272d";
const GOLD = "#c8a24d";
const INK = "#1d1d1d";
const INK_SOFT = "#696158";
const CANVAS = "#f0e6d8";
const CREAM = "#faf5ee";
const LINE = "#e7ddd0";
// Exact copy of https://www.khanabanaopartner.com/logo-mark.png uploaded to
// Brevo's image gallery. Keeping it on Brevo's image CDN avoids the broken
// r.mail branded proxy certificate that Gmail rejects.
const EMAIL_LOGO_URL =
  "https://img.mailinblue.com/11977921/images/rnb/original/6a9948b125aaba004d88d558.png";
const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

/** Inline style for a call-to-action link — templates paste this verbatim. */
export const EMAIL_BUTTON_STYLE = `display:inline-block;background:${CRIMSON};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;line-height:1;padding:14px 30px;border-radius:8px;`;

/**
 * Wrap rendered content HTML in the Khana Banao email shell.
 *
 * `preheader` is the grey line Gmail shows next to the subject in the inbox
 * list. Left empty it falls back to the subject, which reads as a duplicate.
 */
export function wrapEmailHtml(
  contentHtml: string,
  options: { preheader?: string } = {},
): string {
  const preheader = options.preheader?.trim();

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${site.name}</title>
<style>
  body { margin:0; padding:0; width:100% !important; background:${CANVAS}; }
  img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
  table { border-collapse:collapse; }
  .kb-body p { margin:0 0 16px; }
  .kb-body p:last-child { margin-bottom:0; }
  .kb-body a { color:${CRIMSON}; }
  .kb-body strong { color:${INK}; font-weight:600; }
  .kb-body ul { margin:0 0 16px; padding-left:20px; }
  .kb-body li { margin:0 0 6px; }
  @media only screen and (max-width:620px) {
    .kb-card { border-radius:0 !important; }
    .kb-pad { padding-left:24px !important; padding-right:24px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${CANVAS};">
${
  preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;">${preheader}</div>`
    : ""
}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CANVAS};">
  <tr>
    <td align="center" style="padding:32px 12px;">

      <table role="presentation" class="kb-card" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">

        <tr>
          <td align="center" style="background:${MAROON};padding:26px 24px 22px;">
            <img src="${EMAIL_LOGO_URL}" width="252" height="85" alt="Khana Banao — Powered by Food Chain System" style="display:block;width:252px;height:auto;max-width:82%;margin:0 auto;color:#ffffff;font-family:${FONT};font-size:15px;line-height:1.4;text-align:center;">
          </td>
        </tr>
        <tr><td style="height:4px;background:${GOLD};font-size:0;line-height:0;">&nbsp;</td></tr>

        <tr>
          <td class="kb-body kb-pad" style="padding:34px 40px 36px;font-family:${FONT};font-size:15px;line-height:1.7;color:${INK};">
${contentHtml}
          </td>
        </tr>

        <tr>
          <td class="kb-pad" style="padding:22px 40px 26px;background:${CREAM};border-top:1px solid ${LINE};font-family:${FONT};font-size:12px;line-height:1.6;color:${INK_SOFT};">
            <p style="margin:0 0 8px;font-weight:600;color:${MAROON};font-size:13px;">${site.legalName}</p>
            <p style="margin:0 0 10px;">
              Questions? Call <a href="${site.phoneHref}" style="color:${INK_SOFT};text-decoration:underline;">${site.phone}</a>
              or write to <a href="mailto:${site.email}" style="color:${INK_SOFT};text-decoration:underline;">${site.email}</a>.
            </p>
            <p style="margin:0;color:#948a7e;">
              This is an automated message from the Khana Banao franchise portal &mdash; please do not reply to it.
            </p>
          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>
</body>
</html>`;
}
