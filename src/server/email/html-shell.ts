import { getAppOrigin } from "@/lib/app-origin";

import { escapeHtml } from "./escape-html";

const BG = "#0f172a";
const CARD = "#1e293b";
const BORDER = "#334155";
const MUTED = "#94a3b8";
const TEXT = "#e2e8f0";
const ACCENT = "#3b82f6";
const ACCENT_FG = "#ffffff";

type ShellOpts = {
  /** Shown in inbox preview (hidden in body) */
  preheader: string;
  /** Email `<title>` + main heading */
  headline: string;
  /** Trusted HTML fragments (already escaped user strings where needed) */
  bodyHtml: string;
};

/**
 * Table-based layout for broad client support; dark theme aligned with StaffStack marketing.
 */
export function transactionalEmailShell(opts: ShellOpts): string {
  const pre = escapeHtml(opts.preheader);
  const head = escapeHtml(opts.headline);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>${head}</title>
</head>
<body style="margin:0;padding:0;background:${BG};color:${TEXT};font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.6;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${pre}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BG};padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;border-collapse:separate;border-spacing:0;">
          <tr>
            <td style="padding:0 0 28px 0;text-align:left;">
              <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${ACCENT};box-shadow:0 0 20px rgba(59,130,246,0.45);vertical-align:middle;"></span>
              <span style="margin-left:10px;font-size:17px;font-weight:600;letter-spacing:-0.02em;color:${TEXT};vertical-align:middle;">StaffStack</span>
            </td>
          </tr>
          <tr>
            <td style="background:${CARD};border:1px solid ${BORDER};border-radius:16px;padding:36px 32px 32px 32px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.35);">
              <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:600;letter-spacing:-0.02em;line-height:1.25;color:${TEXT};">${head}</h1>
              <div style="font-size:15px;color:${MUTED};">${opts.bodyHtml}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 8px 0 8px;text-align:center;font-size:12px;color:${MUTED};">
              Sent by StaffStack · <a href="${escapeHtml(getAppOrigin())}" style="color:${ACCENT};text-decoration:none;">Open app</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

type CtaOpts = { href: string; label: string };

export function emailPrimaryCta(opts: CtaOpts): string {
  const href = escapeHtml(opts.href);
  const label = escapeHtml(opts.label);
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0 8px 0;">
    <tr>
      <td style="border-radius:10px;background:${ACCENT};">
        <a href="${href}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:${ACCENT_FG};text-decoration:none;border-radius:10px;">${label}</a>
      </td>
    </tr>
  </table>`;
}

export function emailMutedParagraph(text: string): string {
  return `<p style="margin:16px 0 0 0;color:${MUTED};font-size:14px;line-height:1.65;">${escapeHtml(text)}</p>`;
}

export function emailParagraph(htmlSafeLine: string): string {
  return `<p style="margin:0 0 12px 0;color:${TEXT};font-size:15px;">${htmlSafeLine}</p>`;
}
