import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  INVITATION_STATUSES,
  PROFILE_STATUSES,
  ROLES,
  type InvitationStatus,
  type ProfileStatus,
  type Role,
} from "@/lib/domain/enums";
import { pickEnum, toRange, type TableParams } from "@/lib/table/params";

export type MemberRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: Role;
  status: ProfileStatus;
  created_at: string;
  assignedLeads: number;
  acceptedLeads: number;
};

const MEMBER_SORTS = new Set(["full_name", "role", "status", "created_at"]);

export async function listMembers(
  params: TableParams,
): Promise<{ rows: MemberRow[]; total: number }> {
  const supabase = createAdminClient();
  const { from, to } = toRange(params);

  let query = supabase
    .from("profiles")
    .select("id, full_name, email, phone, role, status, created_at", {
      count: "exact",
    });

  if (params.q) {
    const term = `%${params.q}%`;
    query = query.or(`full_name.ilike.${term},email.ilike.${term}`);
  }

  const statusFilter = pickEnum(params.filters.status, PROFILE_STATUSES);
  const roleFilter = pickEnum(params.filters.role, ROLES);
  if (statusFilter) query = query.eq("status", statusFilter);
  if (roleFilter) query = query.eq("role", roleFilter);

  const sortColumn = MEMBER_SORTS.has(params.sort ?? "")
    ? (params.sort as string)
    : "full_name";

  const { data, count } = await query
    .order(sortColumn, { ascending: params.dir === "asc" })
    .range(from, to);

  const members = data ?? [];

  // Lead counts come from the aggregate view rather than a count query per
  // member, so the page stays at two round trips however many members exist.
  const { data: performance } = members.length
    ? await supabase
        .from("member_performance")
        .select("member_id, assigned_leads, accepted_leads")
        .in(
          "member_id",
          members.map((member) => member.id),
        )
    : { data: [] };

  const stats = new Map(
    (performance ?? []).map((row) => [row.member_id, row] as const),
  );

  return {
    total: count ?? 0,
    rows: members.map((member) => ({
      ...member,
      assignedLeads: Number(stats.get(member.id)?.assigned_leads ?? 0),
      acceptedLeads: Number(stats.get(member.id)?.accepted_leads ?? 0),
    })),
  };
}

export type InvitationRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: InvitationStatus;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  invitedByName: string | null;
  /**
   * A PENDING row past its expiry, decided here rather than at render time —
   * reading the clock during render makes the output unstable.
   */
  isExpired: boolean;
};

const INVITATION_SORTS = new Set([
  "full_name",
  "status",
  "created_at",
  "expires_at",
]);

export async function listInvitations(
  params: TableParams,
): Promise<{ rows: InvitationRow[]; total: number }> {
  const supabase = createAdminClient();
  const { from, to } = toRange(params);

  let query = supabase
    .from("member_invitations")
    .select(
      "id, full_name, email, phone, status, created_at, expires_at, accepted_at, invited_by",
      { count: "exact" },
    );

  if (params.q) {
    const term = `%${params.q}%`;
    query = query.or(`full_name.ilike.${term},email.ilike.${term}`);
  }

  const statusFilter = pickEnum(params.filters.status, INVITATION_STATUSES);
  if (statusFilter) query = query.eq("status", statusFilter);

  const sortColumn = INVITATION_SORTS.has(params.sort ?? "")
    ? (params.sort as string)
    : "created_at";

  const { data, count } = await query
    .order(sortColumn, { ascending: params.dir === "asc" })
    .range(from, to);

  const invitations = data ?? [];

  const inviterIds = [
    ...new Set(
      invitations.map((i) => i.invited_by).filter((id): id is string => !!id),
    ),
  ];

  const { data: inviters } = inviterIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", inviterIds)
    : { data: [] };

  const inviterNames = new Map(
    (inviters ?? []).map((profile) => [profile.id, profile.full_name] as const),
  );

  const now = Date.now();

  return {
    total: count ?? 0,
    rows: invitations.map((invitation) => ({
      id: invitation.id,
      full_name: invitation.full_name,
      email: invitation.email,
      phone: invitation.phone,
      status: invitation.status,
      created_at: invitation.created_at,
      expires_at: invitation.expires_at,
      accepted_at: invitation.accepted_at,
      invitedByName: invitation.invited_by
        ? (inviterNames.get(invitation.invited_by) ?? null)
        : null,
      isExpired:
        invitation.status === "PENDING" &&
        new Date(invitation.expires_at).getTime() < now,
    })),
  };
}

/** Pending invitations, for the tab chip. */
export async function countPendingInvitations(): Promise<number> {
  const { count } = await createAdminClient()
    .from("member_invitations")
    .select("id", { count: "exact", head: true })
    .eq("status", "PENDING");
  return count ?? 0;
}
