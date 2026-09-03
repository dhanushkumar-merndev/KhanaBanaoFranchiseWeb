import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { mergeWithAutofill, type AutofillSource } from "@/lib/agreement/autofill";
import type { AgreementFieldValues } from "@/lib/agreement/fields";

/**
 * Reads for the generated agreement — one place so saving, downloading and
 * email attachment generation all assemble the document from identical input.
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
