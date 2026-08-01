import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveMemberNames } from "./leads";
import type {
  ContactChannel,
  DiscussionOutcome,
  FollowupStatus,
  InterestLevel,
  LeadSource,
  LeadStatus,
} from "@/lib/domain/enums";

export type LeadDetailActivity = {
  id: string;
  activity_type: string;
  channel: ContactChannel | null;
  notes: string | null;
  discussion_date: string | null;
  investment_discussed: string | null;
  territory_discussed: string | null;
  interest_level: InterestLevel | null;
  outcome: DiscussionOutcome | null;
  previous_status: LeadStatus | null;
  new_status: LeadStatus | null;
  followup_at: string | null;
  created_at: string;
  memberName: string | null;
};

export type LeadDetailFollowup = {
  id: string;
  due_at: string;
  channel: ContactChannel | null;
  note: string | null;
  status: FollowupStatus;
  completed_at: string | null;
  completed_note: string | null;
  created_at: string;
  memberName: string | null;
  /** Resolved server-side so render never has to read the clock. */
  isOverdue: boolean;
};

export type LeadDetail = {
  id: string;
  lead_number: string;
  full_name: string;
  phone: string;
  whatsapp: string | null;
  email: string;
  city: string;
  source: LeadSource;
  preferred_territory: string | null;
  investment_range: string | null;
  current_occupation: string | null;
  existing_business: string | null;
  message: string | null;
  current_status: LeadStatus;
  business_model_discussed: string | null;
  interest_level: InterestLevel | null;
  rejection_reason: string | null;
  next_followup_at: string | null;
  consent_given: boolean;
  created_at: string;
  updated_at: string;
  assigned_member_id: string | null;
  assignedMemberName: string | null;
  createdByName: string | null;
  nextFollowupOverdue: boolean;
  activities: LeadDetailActivity[];
  followups: LeadDetailFollowup[];
  /** Whether the later pipeline stages have anything to show yet. */
  has: {
    application: boolean;
    documents: boolean;
    agreement: boolean;
    payment: boolean;
    franchise: boolean;
  };
};

/**
 * One lead with everything the detail page renders.
 *
 * Returns null when the lead does not exist *or* the viewer may not see it —
 * the caller shows the same "not found" either way, so a member cannot probe
 * for the existence of leads belonging to someone else.
 */
export async function getLeadDetail(
  leadId: string,
  scopeMemberId: string | null,
): Promise<LeadDetail | null> {
  const supabase = createAdminClient();

  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead) return null;
  if (scopeMemberId && lead.assigned_member_id !== scopeMemberId) return null;

  const [
    { data: activities },
    { data: followups },
    { data: application },
    { data: agreement },
    { data: payment },
    { data: franchise },
  ] = await Promise.all([
    supabase
      .from("lead_activities")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false }),
    supabase
      .from("followups")
      .select("*")
      .eq("lead_id", leadId)
      .order("due_at", { ascending: false }),
    supabase
      .from("applications")
      .select("id, status")
      .eq("lead_id", leadId)
      .maybeSingle(),
    supabase
      .from("agreements")
      .select("id")
      .eq("lead_id", leadId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("payments")
      .select("id")
      .eq("lead_id", leadId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("franchises")
      .select("id")
      .eq("lead_id", leadId)
      .maybeSingle(),
  ]);

  const documentCount = application
    ? ((
        await supabase
          .from("document_requests")
          .select("id", { count: "exact", head: true })
          .eq("application_id", application.id)
      ).count ?? 0)
    : 0;

  const names = await resolveMemberNames([
    lead.assigned_member_id,
    lead.created_by,
    ...(activities ?? []).map((a) => a.member_id),
    ...(followups ?? []).map((f) => f.member_id),
  ]);

  const now = Date.now();

  return {
    ...lead,
    assignedMemberName: lead.assigned_member_id
      ? (names.get(lead.assigned_member_id) ?? null)
      : null,
    createdByName: lead.created_by ? (names.get(lead.created_by) ?? null) : null,
    nextFollowupOverdue:
      lead.next_followup_at !== null &&
      new Date(lead.next_followup_at).getTime() < now,
    activities: (activities ?? []).map((activity) => ({
      id: activity.id,
      activity_type: activity.activity_type,
      channel: activity.channel,
      notes: activity.notes,
      discussion_date: activity.discussion_date,
      investment_discussed: activity.investment_discussed,
      territory_discussed: activity.territory_discussed,
      interest_level: activity.interest_level,
      outcome: activity.outcome,
      previous_status: activity.previous_status,
      new_status: activity.new_status,
      followup_at: activity.followup_at,
      created_at: activity.created_at,
      memberName: activity.member_id ? (names.get(activity.member_id) ?? null) : null,
    })),
    followups: (followups ?? []).map((followup) => ({
      id: followup.id,
      due_at: followup.due_at,
      channel: followup.channel,
      note: followup.note,
      status: followup.status,
      completed_at: followup.completed_at,
      completed_note: followup.completed_note,
      created_at: followup.created_at,
      memberName: followup.member_id ? (names.get(followup.member_id) ?? null) : null,
      isOverdue:
        followup.status === "PENDING" &&
        new Date(followup.due_at).getTime() < now,
    })),
    has: {
      application: Boolean(application),
      documents: documentCount > 0,
      agreement: Boolean(agreement),
      payment: Boolean(payment),
      franchise: Boolean(franchise),
    },
  };
}
