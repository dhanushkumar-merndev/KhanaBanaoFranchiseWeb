/** Template variables available to every email (spec §21). */
export const TEMPLATE_VARIABLES = [
  "applicant_name",
  "lead_number",
  "application_number",
  "application_link",
  "document_names",
  "reupload_reason",
  "territory",
  "agreement_number",
  "payment_amount",
  "franchise_id",
  "dashboard_url",
  "password_setup_link",
  "training_date",
  "support_name",
  "support_phone",
  "verification_code",
] as const;

export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number];
export type TemplateVars = Partial<Record<TemplateVariable, string>>;

const PLACEHOLDER = /\{\{\s*([a-z_]+)\s*\}\}/g;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Substitute `{{variable}}` placeholders.
 *
 * Values are HTML-escaped: template bodies are authored by admins, but the
 * values come from applicant-supplied fields, so they must never be able to
 * inject markup into an outgoing email.
 * Unknown placeholders are left untouched so a typo is visible rather than
 * silently producing a blank.
 */
export function renderTemplate(source: string, vars: TemplateVars): string {
  return source.replace(PLACEHOLDER, (match, key: string) => {
    const value = vars[key as TemplateVariable];
    return value === undefined ? match : escapeHtml(value);
  });
}

/** Placeholders present in a template — powers the admin editor's hints. */
export function extractVariables(source: string): string[] {
  const found = new Set<string>();
  for (const match of source.matchAll(PLACEHOLDER)) found.add(match[1]);
  return [...found];
}

/** Placeholders the caller did not supply — surfaced in the preview dialog. */
export function missingVariables(
  source: string,
  vars: TemplateVars,
): string[] {
  return extractVariables(source).filter(
    (name) => vars[name as TemplateVariable] === undefined,
  );
}

/** Rough plain-text fallback for the multipart body and the log preview. */
export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
