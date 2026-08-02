import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken, verifyToken, type TokenPurpose } from "@/lib/tokens";
import type { ApplicationStatus, LeadStatus } from "@/lib/domain/enums";

export type TokenFailure =
  | "invalid"
  | "expired"
  | "revoked"
  | "not_found";

export type ResolvedToken = {
  tokenId: string;
  leadId: string;
  applicationId: string | null;
  lead: {
    id: string;
    lead_number: string;
    full_name: string;
    phone: string;
    whatsapp: string | null;
    email: string;
    city: string;
    preferred_territory: string | null;
    investment_range: string | null;
    current_occupation: string | null;
    current_status: LeadStatus;
  };
  application: {
    id: string;
    application_number: string;
    status: ApplicationStatus;
    submitted_at: string | null;
  } | null;
};

/**
 * Turn a URL token into the lead behind it, or a reason it will not open.
 *
 * The signature is checked before any query runs, so a scanner spraying the
 * route never reaches the database. Failures are deliberately coarse — the
 * public page shows the same page for every one of them, so a token cannot be
 * probed for whether it merely expired versus never existed.
 */
export async function resolveToken(
  token: string,
  purpose: TokenPurpose,
): Promise<{ ok: true; data: ResolvedToken } | { ok: false; reason: TokenFailure }> {
  if (!token || !verifyToken(token, purpose)) {
    return { ok: false, reason: "invalid" };
  }

  const supabase = createAdminClient();

  const { data: row } = await supabase
    .from("application_tokens")
    .select("id, lead_id, application_id, purpose, expires_at, revoked_at")
    .eq("token_hash", hashToken(token))
    .eq("purpose", purpose)
    .maybeSingle();

  if (!row) return { ok: false, reason: "not_found" };
  if (row.revoked_at) return { ok: false, reason: "revoked" };
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }

  const { data: lead } = await supabase
    .from("leads")
    .select(
      "id, lead_number, full_name, phone, whatsapp, email, city, preferred_territory, investment_range, current_occupation, current_status",
    )
    .eq("id", row.lead_id)
    .maybeSingle();

  if (!lead) return { ok: false, reason: "not_found" };

  const { data: application } = await supabase
    .from("applications")
    .select("id, application_number, status, submitted_at")
    .eq("lead_id", row.lead_id)
    .maybeSingle();

  return {
    ok: true,
    data: {
      tokenId: row.id,
      leadId: row.lead_id,
      applicationId: row.application_id ?? application?.id ?? null,
      lead,
      application: application ?? null,
    },
  };
}

/** Marks a token used without invalidating it — links stay re-openable. */
export async function touchToken(tokenId: string): Promise<void> {
  await createAdminClient()
    .from("application_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", tokenId);
}
