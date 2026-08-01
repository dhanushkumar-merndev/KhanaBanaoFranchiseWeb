import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  LEAD_SOURCES,
  LEAD_STATUSES,
  type LeadSource,
  type LeadStatus,
} from "@/lib/domain/enums";
import { pickEnum, toRange, type TableParams } from "@/lib/table/params";

/** Statuses that mean the lead was accepted — mirrors `lead_is_accepted()`. */
export const ACCEPTED_STATUSES: readonly LeadStatus[] = LEAD_STATUSES.slice(
  LEAD_STATUSES.indexOf("ACCEPTED"),
).filter((status) => status !== "REJECTED");

export type LeadListRow = {
  id: string;
  lead_number: string;
  full_name: string;
  phone: string;
  email: string;
  city: string;
  source: LeadSource;
  current_status: LeadStatus;
  next_followup_at: string | null;
  created_at: string;
  assigned_member_id: string | null;
  assignedMemberName: string | null;
  /**
   * Decided here rather than at render time: "overdue" depends on the current
   * instant, and reading the clock during render makes the output unstable
   * across re-renders and mismatched between server and client.
   */
  followupOverdue: boolean;
};

export type LeadListResult = {
  rows: LeadListRow[];
  total: number;
};

const SORTABLE = new Set([
  "created_at",
  "full_name",
  "lead_number",
  "current_status",
  "city",
  "next_followup_at",
]);

/**
 * Server-side paged lead list.
 *
 * `scopeMemberId` is the whole of the member/admin difference: pass a profile
 * id and the query can only ever return that member's leads, pass null for the
 * unrestricted admin view.
 */
export async function listLeads(
  params: TableParams,
  scopeMemberId: string | null,
): Promise<LeadListResult> {
  const supabase = createAdminClient();
  const { from, to } = toRange(params);

  let query = supabase
    .from("leads")
    .select(
      "id, lead_number, full_name, phone, email, city, source, current_status, next_followup_at, created_at, assigned_member_id",
      { count: "exact" },
    );

  if (scopeMemberId) query = query.eq("assigned_member_id", scopeMemberId);

  if (params.q) {
    const term = `%${params.q}%`;
    query = query.or(
      `full_name.ilike.${term},phone.ilike.${term},email.ilike.${term},lead_number.ilike.${term},city.ilike.${term}`,
    );
  }

  const status = pickEnum(params.filters.status, LEAD_STATUSES);
  if (status) query = query.eq("current_status", status);

  const source = pickEnum(params.filters.source, LEAD_SOURCES);
  if (source) query = query.eq("source", source);

  // Admin-only filters; a scoped query already knows its member.
  if (!scopeMemberId) {
    if (params.filters.member) {
      query = query.eq("assigned_member_id", params.filters.member);
    }
    if (params.filters.assigned === "yes") {
      query = query.not("assigned_member_id", "is", null);
    } else if (params.filters.assigned === "no") {
      query = query.is("assigned_member_id", null);
    }
  }

  if (params.filters.outcome === "accepted") {
    query = query.in("current_status", ACCEPTED_STATUSES);
  } else if (params.filters.outcome === "rejected") {
    query = query.eq("current_status", "REJECTED");
  }

  if (params.filters.due === "overdue") {
    query = query.lte("next_followup_at", new Date().toISOString());
  }

  const sortColumn = SORTABLE.has(params.sort ?? "")
    ? (params.sort as string)
    : "created_at";

  const { data, count } = await query
    .order(sortColumn, { ascending: params.dir === "asc", nullsFirst: false })
    .range(from, to);

  const leads = data ?? [];
  const memberNames = await resolveMemberNames(
    leads.map((lead) => lead.assigned_member_id),
  );
  const now = Date.now();

  return {
    total: count ?? 0,
    rows: leads.map((lead) => ({
      ...lead,
      assignedMemberName: lead.assigned_member_id
        ? (memberNames.get(lead.assigned_member_id) ?? null)
        : null,
      followupOverdue:
        lead.next_followup_at !== null &&
        new Date(lead.next_followup_at).getTime() < now,
    })),
  };
}

/** Batch-resolves profile ids to names in one query. */
export async function resolveMemberNames(
  ids: (string | null)[],
): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (unique.length === 0) return new Map();

  const { data } = await createAdminClient()
    .from("profiles")
    .select("id, full_name")
    .in("id", unique);

  return new Map((data ?? []).map((row) => [row.id, row.full_name] as const));
}

/** Active members, for assignment dropdowns. */
export async function listActiveMembers() {
  const { data } = await createAdminClient()
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "MEMBER")
    .eq("status", "ACTIVE")
    .order("full_name");
  return data ?? [];
}
