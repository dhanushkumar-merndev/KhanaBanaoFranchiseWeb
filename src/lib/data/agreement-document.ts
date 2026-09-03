import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken, verifyToken } from "@/lib/tokens";
import { mergeWithAutofill, type AutofillSource } from "@/lib/agreement/autofill";
import type { AgreementFieldValues } from "@/lib/agreement/fields";

/**
 * Reads for the generated agreement — one place so the staff editor, the
 * preview and the customer's public page all assemble the document from
 * identical inputs. A document that renders differently for staff than for the
 * person signing it is the one bug this feature cannot afford.
 */

export type AgreementDocument = {
  agreementId: string;
  agreementNumber: string;
  version: number;
  status: string;
  leadId: string;
  leadNumber: string;
  franchiseeName: string;
  values: AgreementFieldValues;
  overrides: Record<string, string>;
  documentSentAt: string | null;
};

const AGREEMENT_COLUMNS =
  "id, lead_id, agreement_number, version, status, field_values, clause_overrides, document_sent_at";

const APPLICATION_COLUMNS =
  "personal_details, address_details, business_details, franchise_details, approved_territory, approved_investment";

function asRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === "string") out[key] = entry;
  }
  return out;
}

async function assemble(
  agreement: Record<string, unknown>,
  leadId: string,
): Promise<AgreementDocument | null> {
  const supabase = createAdminClient();

  const { data: lead } = await supabase
    .from("leads")
    .select("id, lead_number, full_name, phone, email, city, preferred_territory")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead) return null;

  const { data: application } = await supabase
    .from("applications")
    .select(APPLICATION_COLUMNS)
    .eq("lead_id", leadId)
    .maybeSingle();

  const source: AutofillSource = {
    lead,
    application: application ?? null,
  };

  const values = mergeWithAutofill(
    asRecord(agreement.field_values),
    source,
  );

  return {
    agreementId: agreement.id as string,
    agreementNumber: agreement.agreement_number as string,
    version: (agreement.version as number) ?? 1,
    status: agreement.status as string,
    leadId,
    leadNumber: lead.lead_number,
    franchiseeName: values.franchisee_name || lead.full_name,
    values,
    overrides: asRecord(agreement.clause_overrides),
    documentSentAt: (agreement.document_sent_at as string | null) ?? null,
  };
}

/** The current agreement for a lead, with autofill applied over saved values. */
export async function loadAgreementDocument(
  agreementId: string,
): Promise<AgreementDocument | null> {
  const { data: agreement } = await createAdminClient()
    .from("agreements")
    .select(AGREEMENT_COLUMNS)
    .eq("id", agreementId)
    .maybeSingle();

  if (!agreement) return null;
  return assemble(agreement, agreement.lead_id);
}

export type AgreementTokenFailure = "invalid" | "expired" | "revoked" | "not_found";

/**
 * Resolve a customer's agreement link.
 *
 * Deliberately separate from resolveToken(): that one returns the lead and
 * application for the forms, while this one has to reach the agreement the
 * token was minted against. Failures stay coarse so a token cannot be probed.
 */
export async function resolveAgreementToken(
  token: string,
): Promise<
  | { ok: true; data: AgreementDocument }
  | { ok: false; reason: AgreementTokenFailure }
> {
  if (!token || !verifyToken(token, "AGREEMENT")) {
    return { ok: false, reason: "invalid" };
  }

  const supabase = createAdminClient();

  const { data: row } = await supabase
    .from("application_tokens")
    .select("id, agreement_id, expires_at, revoked_at")
    .eq("token_hash", hashToken(token))
    .eq("purpose", "AGREEMENT")
    .maybeSingle();

  if (!row?.agreement_id) return { ok: false, reason: "not_found" };
  if (row.revoked_at) return { ok: false, reason: "revoked" };
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }

  const document = await loadAgreementDocument(row.agreement_id);
  if (!document) return { ok: false, reason: "not_found" };

  await supabase
    .from("application_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", row.id);

  return { ok: true, data: document };
}
