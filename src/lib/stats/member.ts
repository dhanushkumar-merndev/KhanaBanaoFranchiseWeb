import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { ACCEPTED_STATUSES } from "@/lib/data/leads";
import type { LeadStatus } from "@/lib/domain/enums";

export type MemberDashboard = {
  newLeads: number;
  followupsToday: number;
  followupsOverdue: number;
  acceptedLeads: number;
  applicationsWaiting: number;
  documentsPending: number;
  paymentProofRejected: number;
  recentActivity: {
    id: string;
    activity_type: string;
    notes: string | null;
    created_at: string;
    leadId: string;
    leadName: string;
    leadNumber: string;
  }[];
};

/** Boundaries of "today" in IST — see the note in lib/data/followups.ts. */
function istDayBounds(now = new Date()) {
  const IST_OFFSET_MS = 5.5 * 60 * 60_000;
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);
  const startOfIstDay = Date.UTC(
    istNow.getUTCFullYear(),
    istNow.getUTCMonth(),
    istNow.getUTCDate(),
  );
  return {
    start: new Date(startOfIstDay - IST_OFFSET_MS).toISOString(),
    end: new Date(startOfIstDay + 24 * 60 * 60_000 - IST_OFFSET_MS).toISOString(),
    now: now.toISOString(),
  };
}

const WAITING_APPLICATION: LeadStatus[] = [
  "APPLICATION_LINK_SENT",
  "APPLICATION_IN_PROGRESS",
  "APPLICATION_SUBMITTED",
  "APPLICATION_UNDER_REVIEW",
];

const DOCUMENTS_OUTSTANDING: LeadStatus[] = [
  "DOCUMENTS_PENDING",
  "DOCUMENTS_PARTIALLY_SUBMITTED",
  "DOCUMENT_CORRECTION_REQUIRED",
];

/** Everything on the member dashboard (spec §23), scoped to their own leads. */
export async function getMemberDashboard(
  memberId: string,
): Promise<MemberDashboard> {
  const supabase = createAdminClient();
  const bounds = istDayBounds();

  const leadCount = (statuses: LeadStatus[]) =>
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("assigned_member_id", memberId)
      .in("current_status", statuses);

  const [
    newLeads,
    followupsToday,
    followupsOverdue,
    acceptedLeads,
    applicationsWaiting,
    documentsPending,
    paymentProofRejected,
    recent,
  ] = await Promise.all([
    leadCount(["NEW", "ASSIGNED"]),
    supabase
      .from("followups")
      .select("id", { count: "exact", head: true })
      .eq("member_id", memberId)
      .eq("status", "PENDING")
      .gte("due_at", bounds.start)
      .lt("due_at", bounds.end),
    supabase
      .from("followups")
      .select("id", { count: "exact", head: true })
      .eq("member_id", memberId)
      .eq("status", "PENDING")
      .lt("due_at", bounds.now),
    leadCount([...ACCEPTED_STATUSES]),
    leadCount(WAITING_APPLICATION),
    leadCount(DOCUMENTS_OUTSTANDING),
    leadCount(["PAYMENT_REJECTED"]),
    supabase
      .from("lead_activities")
      .select("id, activity_type, notes, created_at, lead_id")
      .eq("member_id", memberId)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const activities = recent.data ?? [];
  const leadIds = [...new Set(activities.map((a) => a.lead_id))];

  const { data: leads } = leadIds.length
    ? await supabase
        .from("leads")
        .select("id, full_name, lead_number")
        .in("id", leadIds)
    : { data: [] };

  const leadMap = new Map((leads ?? []).map((lead) => [lead.id, lead] as const));

  return {
    newLeads: newLeads.count ?? 0,
    followupsToday: followupsToday.count ?? 0,
    followupsOverdue: followupsOverdue.count ?? 0,
    acceptedLeads: acceptedLeads.count ?? 0,
    applicationsWaiting: applicationsWaiting.count ?? 0,
    documentsPending: documentsPending.count ?? 0,
    paymentProofRejected: paymentProofRejected.count ?? 0,
    recentActivity: activities.flatMap((activity) => {
      const lead = leadMap.get(activity.lead_id);
      if (!lead) return [];
      return [
        {
          id: activity.id,
          activity_type: activity.activity_type,
          notes: activity.notes,
          created_at: activity.created_at,
          leadId: activity.lead_id,
          leadName: lead.full_name,
          leadNumber: lead.lead_number,
        },
      ];
    }),
  };
}
