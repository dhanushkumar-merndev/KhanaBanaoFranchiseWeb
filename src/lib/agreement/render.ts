import { AGREEMENT_CLAUSES, type Clause } from "./clauses";
import type { AgreementFieldValues } from "./fields";

/**
 * Turn clauses + field values into the finished agreement document.
 *
 * Values are HTML-escaped. The clause text is authored by us (and, for an
 * override, by an admin), but the values come from an applicant-filled form,
 * so a name containing `<script>` must never become markup.
 */

const PLACEHOLDER = /\{\{\s*([a-z0-9_]+)\s*\}\}/g;

/** Rendered where a value is still blank, matching the paper original. */
const BLANK = '<span class="blank">&nbsp;</span>';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** A date field holds `YYYY-MM-DD`; the document wants `12 August 2026`. */
function presentValue(key: string, value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T00:00:00`);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
  }
  return value;
}

function fill(html: string, values: AgreementFieldValues): string {
  return html.replace(PLACEHOLDER, (_match, key: string) => {
    const raw = values[key]?.trim();
    if (!raw) return BLANK;
    return escapeHtml(presentValue(key, raw)).replace(/\n/g, "<br>");
  });
}

export type RenderedClause = Clause & {
  /** True when an admin replaced this clause's wording for this agreement. */
  overridden: boolean;
  filledHtml: string;
};

/**
 * Apply overrides and substitute values, clause by clause.
 *
 * An override replaces the body only — the number and heading stay, so the
 * document's structure survives however the text was rewritten.
 */
export function renderClauses(
  values: AgreementFieldValues,
  overrides: Record<string, string> = {},
): RenderedClause[] {
  return AGREEMENT_CLAUSES.map((clause) => {
    const override = overrides[clause.id]?.trim();
    return {
      ...clause,
      overridden: Boolean(override),
      filledHtml: fill(override || clause.html, values),
    };
  });
}

export type DocumentMeta = {
  agreementNumber: string;
  version: number;
  documentVersion: string;
  franchiseeName: string;
};

/** The `<body>` of the agreement — used by the public page and the preview. */
export function renderDocumentBody(
  values: AgreementFieldValues,
  overrides: Record<string, string>,
  meta: DocumentMeta,
): string {
  const clauses = renderClauses(values, overrides);

  const sections = clauses
    .map(
      (clause) => `
<section class="clause" id="clause-${clause.id}">
  <h2>${clause.number ? `${clause.number}. ` : ""}${escapeHtml(clause.heading)}</h2>
  ${clause.filledHtml}
</section>`,
    )
    .join("");

  return `
<div class="document-header" aria-hidden="true">
  <img class="document-chrome-image" src="/agreement/header-source.jpg" alt="">
  <div class="header-logo-replacement"><img src="/logo.png" alt=""></div>
</div>
<div class="document-footer" aria-hidden="true">
  <img class="document-chrome-image" src="/agreement/footer.jpg" alt="">
</div>
<div class="document-watermarks" aria-hidden="true">
  <img class="watermark-fcs" src="/agreement/fcs-watermark.png" alt="">
  <div class="watermark-brand-crop"><img src="/logo.png" alt=""></div>
</div>
<header class="doc-head">
  <h1>KHANA BANAO MASTER FRANCHISE AGREEMENT</h1>
  <p class="doc-sub">Powered by Food Chain System</p>
  <p class="doc-sub">FOFO &bull; Event &bull; Wedding &bull; Corporate Catering</p>
  <p class="doc-notice">MASTER AGREEMENT &ndash; COMMERCIAL SCHEDULE TO BE COMPLETED BEFORE EXECUTION</p>
  <dl class="doc-ref">
    <dt>Agreement</dt><dd>${escapeHtml(meta.agreementNumber)}</dd>
    <dt>Version</dt><dd>v${meta.version}</dd>
    <dt>Franchisee</dt><dd>${escapeHtml(meta.franchiseeName)}</dd>
  </dl>
</header>
<main class="doc-body">${sections}</main>
<p class="doc-version">Document template ${escapeHtml(meta.documentVersion)}</p>`;
}

/**
 * Print-first stylesheet.
 *
 * The customer's "save as PDF" runs through this, so the page is sized in
 * millimetres against the Letter-size source agreement.
 */
export const AGREEMENT_STYLES = `
:root {
  --ink: #1a1a1a;
  --ink-soft: #555555;
  --maroon: #650006;
  --gold: #bd8d21;
  --line: #a9a9a9;
  --paper: #ffffff;
}
* { box-sizing: border-box; }
html { background: #d8d2ca; }
body {
  margin: 0;
  background: #d8d2ca;
  color: var(--ink);
  font-family: Arial, Helvetica, sans-serif;
  font-size: 9.25pt;
  line-height: 1.48;
}
.sheet {
  position: relative;
  isolation: isolate;
  background: var(--paper);
  width: 216mm;
  min-height: 279.4mm;
  margin: 0 auto;
  padding: 47mm 20mm 43mm;
  box-shadow: 0 2px 30px rgba(0,0,0,.18);
}

.document-header,
.document-footer {
  position: absolute;
  left: 0;
  z-index: 0;
  width: 100%;
  line-height: 0;
  pointer-events: none;
  overflow: hidden;
}
.document-header { top: 0; height: 40.5mm; border-bottom: .35mm solid var(--gold); background: #fff; }
.document-footer { bottom: 0; height: 36.5mm; border-top: .35mm solid var(--gold); background: #fff; }
.document-chrome-image { display: block; width: 100%; height: auto; }
.header-logo-replacement {
  position: absolute;
  top: 7.5mm;
  left: 95mm;
  width: 50mm;
  height: 32.5mm;
  background: #fff;
  overflow: hidden;
}
.header-logo-replacement img {
  position: absolute;
  top: 0;
  left: 3.5mm;
  display: block;
  width: 43mm;
  height: auto;
}
.document-watermarks {
  position: absolute;
  z-index: 0;
  top: 118mm;
  left: 50%;
  display: flex;
  width: 136mm;
  height: 40mm;
  align-items: center;
  justify-content: space-between;
  opacity: .09;
  transform: translateX(-50%);
  pointer-events: none;
}
.watermark-fcs { display: block; width: 57mm; height: auto; }
.watermark-brand-crop {
  position: relative;
  width: 65mm;
  height: 35mm;
  overflow: hidden;
}
.watermark-brand-crop img {
  position: absolute;
  top: -8mm;
  left: 0;
  display: block;
  width: 65mm;
  height: auto;
}

.doc-head { position: relative; z-index: 1; margin: 0 0 18px; }
.doc-head h1 { margin: 0 0 3px; text-align: center; font-size: 12pt; line-height: 1.25; color: var(--ink); }
.doc-sub { margin: 0; text-align: center; font-size: 8.5pt; color: var(--ink); }
.doc-sub + .doc-sub { margin-top: 13px; text-align: left; font-size: 9pt; font-weight: 600; }
.doc-notice { max-width: 118mm; margin: 12px 0 0; font-size: 9pt; font-weight: 700; line-height: 1.4; }
.doc-ref { display: grid; grid-template-columns: auto 1fr; gap: 1px 8px; width: max-content; max-width: 100%; margin: 11px 0 0 auto; font-size: 7.5pt; line-height: 1.3; }
.doc-ref dt { color: var(--ink-soft); text-align: right; }
.doc-ref dt::after { content: ":"; }
.doc-ref dd { margin: 0; font-weight: 600; text-align: left; }

.doc-body { position: relative; z-index: 1; }
.clause { margin: 0 0 16px; }
.clause h2 { margin: 0 0 8px; padding-bottom: 4px; border-bottom: 1px solid var(--line); color: var(--ink); font-size: 9.75pt; line-height: 1.3; break-after: avoid-page; }
.clause h4 { margin: 11px 0 5px; color: var(--ink); font-size: 9.25pt; line-height: 1.35; }
.clause p { margin: 0 0 7px; text-align: justify; }
.clause ul, .clause ol { margin: 0 0 8px; padding-left: 21px; }
.clause li { margin: 0 0 3px; padding-left: 2px; }

.party-label { font-weight: 700; letter-spacing: .06em; margin-top: 14px !important; }
.address { font-weight: 600; }
.amount { font-size: 13pt; font-weight: 700; margin: 10px 0 2px !important; }
.amount-words { font-style: italic; color: var(--ink-soft); }

.party-details, .execution { display: grid; grid-template-columns: 32mm 1fr; gap: 5px 12px; margin: 11px 0; }
.party-details dt, .execution dt { color: var(--ink-soft); }
.party-details dt::after, .execution dt::after { content: ":"; }
.party-details dd, .execution dd { margin: 0; font-weight: 600; border-bottom: 1px dotted var(--line); }

table { width: 100%; border-collapse: collapse; margin: 10px 0 12px; font-size: 8pt; break-inside: auto; }
tr { break-inside: avoid; break-after: auto; }
th, td { border: 1px solid var(--line); padding: 5px 6px; text-align: left; vertical-align: top; }
thead th { background: #f5f5f5; color: var(--ink); }
table.schedule th { width: 38%; background: #f7f7f7; font-weight: 600; }
table.tiers tbody th { background: #f7f7f7; white-space: nowrap; }

.blank { display: inline-block; min-width: 150px; border-bottom: 1px solid var(--ink-soft); }
td .blank, dd .blank { min-width: 90px; }

.sign-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 14px; }
.sign-block { padding: 9px 0; break-inside: avoid-page; }
.sign-block h4 { margin: 0 0 2px; font-size: 9.25pt; color: var(--ink); }
.sign-role { margin: 0 0 8px !important; font-size: 8.5pt; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-soft); }
.sign-block dl { display: grid; grid-template-columns: 88px 1fr; gap: 5px 10px; margin: 0 0 10px; font-size: 9.5pt; }
.sign-block dt { color: var(--ink-soft); }
.sign-block dt::after { content: ":"; }
.sign-block dd { margin: 0; border-bottom: 1px dotted var(--line); }
.sign-line { margin: 0 0 14px !important; font-size: 9pt; color: var(--ink-soft); border-bottom: 1px solid var(--ink-soft); padding-top: 22px; }

.doc-version { position: relative; z-index: 1; margin: 18px 0 0; text-align: right; font-size: 6.5pt; color: #777; }

@media print {
  html, body { background: var(--paper); }
  .sheet { width: auto; min-height: 0; box-shadow: none; margin: 0; padding: 0; }
  .document-header,
  .document-footer,
  .document-watermarks { position: fixed; }
  .document-header { top: -47mm; left: -20mm; width: 216mm; }
  .document-footer { bottom: -43mm; left: -20mm; width: 216mm; }
  .document-watermarks { top: 87.5mm; left: 50%; transform: translateX(-50%); }
  .no-print { display: none !important; }
  @page { size: Letter portrait; margin: 47mm 20mm 43mm; }
}
@media (max-width: 820px) {
  .sheet { width: 100%; min-height: 0; padding: 118px 18px 112px; }
  .document-watermarks { top: 430px; width: 82%; }
  .sign-grid { grid-template-columns: 1fr; }
  .party-details, .execution { grid-template-columns: 1fr; gap: 2px; }
  table { display: block; overflow-x: auto; }
}
`;

/**
 * A complete standalone HTML document.
 *
 * Used for the staff preview, which renders inside a sandboxed iframe so the
 * agreement is shown at its real page width and an admin's clause override
 * cannot reach the dashboard's DOM.
 */
export function renderFullDocument(
  values: AgreementFieldValues,
  overrides: Record<string, string>,
  meta: DocumentMeta,
): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(meta.agreementNumber)}</title>
<style>${AGREEMENT_STYLES}</style>
</head>
<body>
<article class="sheet">${renderDocumentBody(values, overrides, meta)}</article>
</body>
</html>`;
}
