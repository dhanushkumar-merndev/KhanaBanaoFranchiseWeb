"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth/session";
import { isAdmin } from "@/lib/domain/permissions";
import { canTransition } from "@/lib/domain/transitions";
import type { ContactChannel, LeadStatus } from "@/lib/domain/enums";
import {
  normalizeEmail,
  normalizePhone,
  normalizeText,
} from "@/lib/domain/normalize";
import { sendTemplateEmail } from "@/lib/email/send";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  businessDiscussionSchema,
  createLeadSchema,
  followupSchema,
  logContactSchema,
  reassignLeadSchema,
  rejectLeadSchema,
  rescheduleFollowupSchema,
  type BusinessDiscussionInput,
  type CreateLeadInput,
  type FollowupInput,
  type LogContactInput,
  type ReassignLeadInput,
  type RejectLeadInput,
  type RescheduleFollowupInput,
} from "@/lib/validation/lead";
import { invalid, type ActionResult } from "@/lib/validation/result";

/** Empty strings from `<select>`/`<input>` mean "not provided". */
function blank(value: string | undefined | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isoOrNull(value: string | undefined | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function refreshLead(leadId: string) {
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath(`/member/leads/${leadId}`);
  revalidatePath("/admin/leads");
  revalidatePath("/member/leads");
  revalidatePath("/admin/follow-ups");
  revalidatePath("/member/follow-ups");
}

type LeadGuard = {
  profile: Awaited<ReturnType<typeof requireProfile>>;
  lead: {
    id: string;
    lead_number: string;
    full_name: string;
    email: string;
    current_status: LeadStatus;
    assigned_member_id: string | null;
  };
};

/**
 * Resolves the lead and confirms the caller may act on it.
 *
 * Members may only touch leads assigned to them. This runs on every mutation
 * rather than being inferred from which page called it, because the page is
 * not what the browser sends.
 */
async function guardLead(leadId: string): Promise<LeadGuard | ActionResult<never>> {
  const profile = await requireProfile();

  const { data: lead } = await createAdminClient()
    .from("leads")
    .select("id, lead_number, full_name, email, current_status, assigned_member_id")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead) return { ok: false, message: "That lead no longer exists." };

  if (!isAdmin(profile.role) && lead.assigned_member_id !== profile.id) {
    return { ok: false, message: "That lead is not assigned to you." };
  }

  return { profile, lead };
}

function isGuardFailure(
  value: LeadGuard | ActionResult<never>,
): value is ActionResult<never> {
  return "ok" in value;
}

/**
 * Moves a lead's status and records the change on the activity timeline.
 * Refuses moves the pipeline does not allow, so a stale tab cannot skip a gate.
 */
async function transitionLead(input: {
  leadId: string;
  from: LeadStatus;
  to: LeadStatus;
  actorId: string;
  patch?: Record<string, unknown>;
  summary?: string;
}): Promise<{ ok: true } | ActionResult<never>> {
  if (!canTransition(input.from, input.to)) {
    return {
      ok: false,
      message: `This lead cannot move to that stage from its current one.`,
    };
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("leads")
    .update({ current_status: input.to, ...input.patch })
    .eq("id", input.leadId);

  if (error) return { ok: false, message: error.message };

  if (input.from !== input.to) {
    await supabase.from("lead_activities").insert({
      lead_id: input.leadId,
      member_id: input.actorId,
      activity_type: "STATUS_CHANGE",
      previous_status: input.from,
      new_status: input.to,
      notes: input.summary ?? null,
    });
  }

  return { ok: true };
}

// -------------------------------------------------------------------
// Manual lead creation (spec §8)
// -------------------------------------------------------------------

export async function createLead(
  input: CreateLeadInput,
): Promise<ActionResult<{ leadId: string; leadNumber: string; assignedTo: string | null }>> {
  const profile = await requireProfile();

  const parsed = createLeadSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);

  const supabase = createAdminClient();
  const values = parsed.data;
  const phone = normalizePhone(values.phone);
  const email = normalizeEmail(values.email);

  // Same-person guard as the public form: two records for one applicant make
  // the pipeline lie about volume.
  const { data: duplicate } = await supabase
    .from("leads")
    .select("id, lead_number")
    .or(`phone.eq.${phone},email.eq.${email}`)
    .limit(1)
    .maybeSingle();

  if (duplicate) {
    return {
      ok: false,
      message: `That phone or email already belongs to lead ${duplicate.lead_number}.`,
      fieldErrors: { phone: "Already in the pipeline" },
    };
  }

  const manualAssignee = blank(values.assignedMemberId);
  // Members may only ever create leads on their own name.
  const assignedMemberId = isAdmin(profile.role) ? manualAssignee : profile.id;

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      full_name: normalizeText(values.fullName),
      phone,
      whatsapp: values.whatsapp ? normalizePhone(values.whatsapp) : null,
      email,
      city: normalizeText(values.city),
      source: values.source,
      preferred_territory: blank(values.preferredTerritory),
      investment_range: blank(values.investmentRange),
      current_occupation: blank(values.currentOccupation),
      message: blank(values.message),
      assigned_member_id: assignedMemberId,
      current_status: assignedMemberId ? "ASSIGNED" : "NEW",
      created_by: profile.id,
    })
    .select("id, lead_number, assigned_member_id")
    .single();

  if (error || !lead) {
    return { ok: false, message: error?.message ?? "Could not create the lead." };
  }

  let finalAssignee = lead.assigned_member_id;

  if (finalAssignee) {
    await supabase.from("lead_assignments").insert({
      lead_id: lead.id,
      member_id: finalAssignee,
      assigned_by: profile.id,
      method: "MANUAL",
      note: "Assigned when the lead was created.",
    });
  } else {
    // Rotation happens in Postgres so two simultaneous creations cannot land
    // on the same member (spec §9).
    const { data: assigned } = await supabase.rpc("assign_lead_round_robin", {
      target_lead: lead.id,
    });
    finalAssignee = assigned ?? null;
  }

  await supabase.from("activity_logs").insert({
    actor_id: profile.id,
    entity_type: "lead",
    entity_id: lead.id,
    action: "LEAD_CREATED",
    summary: `${lead.lead_number} created manually from ${values.source}.`,
  });

  revalidatePath("/admin/leads");
  revalidatePath("/member/leads");

  return {
    ok: true,
    data: {
      leadId: lead.id,
      leadNumber: lead.lead_number,
      assignedTo: finalAssignee,
    },
  };
}

// -------------------------------------------------------------------
// Contact + discussion (spec §12)
// -------------------------------------------------------------------

export async function logContact(
  leadId: string,
  input: LogContactInput,
): Promise<ActionResult> {
  const guard = await guardLead(leadId);
  if (isGuardFailure(guard)) return guard;

  const parsed = logContactSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);

  const supabase = createAdminClient();

  await supabase.from("lead_activities").insert({
    lead_id: leadId,
    member_id: guard.profile.id,
    activity_type: "CONTACT",
    channel: parsed.data.channel as ContactChannel,
    notes: parsed.data.notes,
    discussion_date: new Date().toISOString(),
  });

  // Only the untouched states advance; a later-stage lead keeps its status.
  const from = guard.lead.current_status;
  if (from === "NEW" || from === "ASSIGNED") {
    const moved = await transitionLead({
      leadId,
      from,
      to: "CONTACTED",
      actorId: guard.profile.id,
      summary: "First contact recorded.",
    });
    if ("message" in moved) return moved;
  }

  refreshLead(leadId);
  return { ok: true };
}

export async function recordBusinessDiscussion(
  leadId: string,
  input: BusinessDiscussionInput,
): Promise<ActionResult> {
  const guard = await guardLead(leadId);
  if (isGuardFailure(guard)) return guard;

  const parsed = businessDiscussionSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);

  const supabase = createAdminClient();
  const values = parsed.data;
  const from = guard.lead.current_status;
  const nextFollowupAt = isoOrNull(values.nextFollowupAt);

  await supabase.from("lead_activities").insert({
    lead_id: leadId,
    member_id: guard.profile.id,
    activity_type: "BUSINESS_DISCUSSION",
    channel: values.channel as ContactChannel,
    discussion_date: new Date(values.discussionDate).toISOString(),
    notes: values.summary,
    investment_discussed: blank(values.investmentDiscussed),
    territory_discussed: blank(values.territoryDiscussed),
    interest_level: blank(values.interestLevel) as never,
    outcome: values.outcome,
    followup_at: nextFollowupAt,
  });

  const patch: Record<string, unknown> = {
    business_model_discussed: blank(values.businessModelDiscussed),
    next_followup_at: nextFollowupAt,
  };
  if (blank(values.interestLevel)) patch.interest_level = values.interestLevel;

  // The outcome decides the stage; UNREACHABLE deliberately leaves it alone.
  let target: LeadStatus = from;
  if (values.outcome === "ACCEPTED") target = "ACCEPTED";
  else if (values.outcome === "REJECTED") {
    target = "REJECTED";
    patch.rejection_reason = values.rejectionReason?.trim() ?? null;
  } else if (values.outcome === "FOLLOW_UP_REQUIRED") target = "FOLLOW_UP";
  else if (from === "NEW" || from === "ASSIGNED" || from === "CONTACTED") {
    target = "BUSINESS_DISCUSSION";
  }

  // BUSINESS_DISCUSSION is not reachable from every earlier state; when it is
  // not, the record still stands and only the status stays put.
  if (target !== from && !canTransition(from, target)) target = from;

  const moved = await transitionLead({
    leadId,
    from,
    to: target,
    actorId: guard.profile.id,
    patch,
    summary: `Business discussion recorded — ${values.outcome.toLowerCase().replaceAll("_", " ")}.`,
  });
  if ("message" in moved) return moved;

  if (nextFollowupAt && values.outcome === "FOLLOW_UP_REQUIRED") {
    await supabase.from("followups").insert({
      lead_id: leadId,
      member_id: guard.lead.assigned_member_id ?? guard.profile.id,
      due_at: nextFollowupAt,
      channel: values.channel as ContactChannel,
      note: blank(values.notes) ?? "Follow-up from business discussion.",
      created_by: guard.profile.id,
    });
  }

  refreshLead(leadId);
  return { ok: true };
}

export async function acceptLead(leadId: string): Promise<ActionResult> {
  const guard = await guardLead(leadId);
  if (isGuardFailure(guard)) return guard;

  const moved = await transitionLead({
    leadId,
    from: guard.lead.current_status,
    to: "ACCEPTED",
    actorId: guard.profile.id,
    summary: "Lead accepted.",
  });
  if ("message" in moved) return moved;

  await createAdminClient().from("activity_logs").insert({
    actor_id: guard.profile.id,
    entity_type: "lead",
    entity_id: leadId,
    action: "LEAD_ACCEPTED",
    summary: `${guard.lead.lead_number} accepted.`,
  });

  refreshLead(leadId);
  return { ok: true };
}

export async function rejectLead(
  leadId: string,
  input: RejectLeadInput,
): Promise<ActionResult> {
  const guard = await guardLead(leadId);
  if (isGuardFailure(guard)) return guard;

  const parsed = rejectLeadSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);

  const moved = await transitionLead({
    leadId,
    from: guard.lead.current_status,
    to: "REJECTED",
    actorId: guard.profile.id,
    patch: { rejection_reason: parsed.data.reason, next_followup_at: null },
    summary: parsed.data.reason,
  });
  if ("message" in moved) return moved;

  const supabase = createAdminClient();

  // Nothing is owed on a rejected lead, so open follow-ups are closed out.
  await supabase
    .from("followups")
    .update({ status: "CANCELLED" })
    .eq("lead_id", leadId)
    .eq("status", "PENDING");

  await supabase.from("activity_logs").insert({
    actor_id: guard.profile.id,
    entity_type: "lead",
    entity_id: leadId,
    action: "LEAD_REJECTED",
    summary: `${guard.lead.lead_number} rejected: ${parsed.data.reason}`,
  });

  refreshLead(leadId);
  return { ok: true };
}

// -------------------------------------------------------------------
// Assignment (spec §9)
// -------------------------------------------------------------------

export async function reassignLead(
  leadId: string,
  input: ReassignLeadInput,
): Promise<ActionResult> {
  const profile = await requireProfile();
  if (!isAdmin(profile.role)) {
    return { ok: false, message: "Only an administrator can reassign leads." };
  }

  const parsed = reassignLeadSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);

  const supabase = createAdminClient();

  const { data: lead } = await supabase
    .from("leads")
    .select("id, lead_number, assigned_member_id, current_status")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead) return { ok: false, message: "That lead no longer exists." };

  const { data: member } = await supabase
    .from("profiles")
    .select("id, full_name, role, status")
    .eq("id", parsed.data.memberId)
    .maybeSingle();

  if (!member || member.status !== "ACTIVE") {
    return {
      ok: false,
      message: "Pick an active member.",
      fieldErrors: { memberId: "Not an active member" },
    };
  }

  if (member.id === lead.assigned_member_id) {
    return { ok: false, message: `This lead is already with ${member.full_name}.` };
  }

  const { error } = await supabase
    .from("leads")
    .update({
      assigned_member_id: member.id,
      // An unassigned lead becomes assigned; a lead further along keeps its
      // stage — reassigning an owner does not rewind the pipeline.
      current_status:
        lead.current_status === "NEW" ? "ASSIGNED" : lead.current_status,
    })
    .eq("id", leadId);

  if (error) return { ok: false, message: error.message };

  await supabase.from("lead_assignments").insert({
    lead_id: leadId,
    member_id: member.id,
    previous_member_id: lead.assigned_member_id,
    assigned_by: profile.id,
    method: "MANUAL",
    note: parsed.data.note?.trim() || null,
  });

  // Open follow-ups move with the lead, otherwise they sit in the old
  // owner's queue where nobody will action them.
  await supabase
    .from("followups")
    .update({ member_id: member.id })
    .eq("lead_id", leadId)
    .eq("status", "PENDING");

  await supabase.from("activity_logs").insert({
    actor_id: profile.id,
    entity_type: "lead",
    entity_id: leadId,
    action: "LEAD_REASSIGNED",
    summary: `${lead.lead_number} reassigned to ${member.full_name}.`,
  });

  refreshLead(leadId);
  return { ok: true };
}

/** Runs the rotation for a lead nobody owns yet. */
export async function autoAssignLead(leadId: string): Promise<ActionResult> {
  const profile = await requireProfile();
  if (!isAdmin(profile.role)) {
    return { ok: false, message: "Only an administrator can assign leads." };
  }

  const supabase = createAdminClient();
  const { data: memberId, error } = await supabase.rpc("assign_lead_round_robin", {
    target_lead: leadId,
  });

  if (error) return { ok: false, message: error.message };
  if (!memberId) {
    return {
      ok: false,
      message: "There are no active members to assign this lead to.",
    };
  }

  refreshLead(leadId);
  return { ok: true };
}

// -------------------------------------------------------------------
// Follow-ups (spec §12)
// -------------------------------------------------------------------

export async function createFollowup(
  leadId: string,
  input: FollowupInput,
): Promise<ActionResult> {
  const guard = await guardLead(leadId);
  if (isGuardFailure(guard)) return guard;

  const parsed = followupSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);

  const dueAt = new Date(parsed.data.dueAt).toISOString();
  const supabase = createAdminClient();

  const { error } = await supabase.from("followups").insert({
    lead_id: leadId,
    member_id: guard.lead.assigned_member_id ?? guard.profile.id,
    due_at: dueAt,
    channel: (blank(parsed.data.channel) as ContactChannel | null) ?? null,
    note: blank(parsed.data.note),
    created_by: guard.profile.id,
  });

  if (error) return { ok: false, message: error.message };

  // The lead header shows the soonest pending follow-up, so it only moves
  // earlier — a later one must not hide a nearer commitment.
  const { data: soonest } = await supabase
    .from("followups")
    .select("due_at")
    .eq("lead_id", leadId)
    .eq("status", "PENDING")
    .order("due_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  await supabase
    .from("leads")
    .update({ next_followup_at: soonest?.due_at ?? null })
    .eq("id", leadId);

  refreshLead(leadId);
  return { ok: true };
}

export async function completeFollowup(
  followupId: string,
  completedNote?: string,
): Promise<ActionResult> {
  const profile = await requireProfile();
  const supabase = createAdminClient();

  const { data: followup } = await supabase
    .from("followups")
    .select("id, lead_id, member_id, status")
    .eq("id", followupId)
    .maybeSingle();

  if (!followup) return { ok: false, message: "That follow-up no longer exists." };

  if (!isAdmin(profile.role) && followup.member_id !== profile.id) {
    return { ok: false, message: "That follow-up is not yours." };
  }
  if (followup.status === "COMPLETED") {
    return { ok: false, message: "That follow-up is already complete." };
  }

  const { error } = await supabase
    .from("followups")
    .update({
      status: "COMPLETED",
      completed_at: new Date().toISOString(),
      completed_note: completedNote?.trim() || null,
    })
    .eq("id", followupId);

  if (error) return { ok: false, message: error.message };

  await refreshNextFollowup(followup.lead_id);
  refreshLead(followup.lead_id);
  return { ok: true };
}

export async function rescheduleFollowup(
  input: RescheduleFollowupInput,
): Promise<ActionResult> {
  const profile = await requireProfile();

  const parsed = rescheduleFollowupSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);

  const supabase = createAdminClient();

  const { data: followup } = await supabase
    .from("followups")
    .select("id, lead_id, member_id, due_at, status, note")
    .eq("id", parsed.data.followupId)
    .maybeSingle();

  if (!followup) return { ok: false, message: "That follow-up no longer exists." };
  if (!isAdmin(profile.role) && followup.member_id !== profile.id) {
    return { ok: false, message: "That follow-up is not yours." };
  }

  // The original is marked RESCHEDULED rather than edited, so the history
  // shows that a commitment moved rather than silently changing.
  await supabase
    .from("followups")
    .update({ status: "RESCHEDULED" })
    .eq("id", followup.id);

  const { error } = await supabase.from("followups").insert({
    lead_id: followup.lead_id,
    member_id: followup.member_id,
    due_at: new Date(parsed.data.dueAt).toISOString(),
    note: blank(parsed.data.note) ?? followup.note,
    created_by: profile.id,
  });

  if (error) return { ok: false, message: error.message };

  await refreshNextFollowup(followup.lead_id);
  refreshLead(followup.lead_id);
  return { ok: true };
}

export async function cancelFollowup(followupId: string): Promise<ActionResult> {
  const profile = await requireProfile();
  const supabase = createAdminClient();

  const { data: followup } = await supabase
    .from("followups")
    .select("id, lead_id, member_id, status")
    .eq("id", followupId)
    .maybeSingle();

  if (!followup) return { ok: false, message: "That follow-up no longer exists." };
  if (!isAdmin(profile.role) && followup.member_id !== profile.id) {
    return { ok: false, message: "That follow-up is not yours." };
  }

  const { error } = await supabase
    .from("followups")
    .update({ status: "CANCELLED" })
    .eq("id", followupId);

  if (error) return { ok: false, message: error.message };

  await refreshNextFollowup(followup.lead_id);
  refreshLead(followup.lead_id);
  return { ok: true };
}

/** Recomputes `leads.next_followup_at` from whatever is still pending. */
async function refreshNextFollowup(leadId: string) {
  const supabase = createAdminClient();

  const { data: soonest } = await supabase
    .from("followups")
    .select("due_at")
    .eq("lead_id", leadId)
    .eq("status", "PENDING")
    .order("due_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  await supabase
    .from("leads")
    .update({ next_followup_at: soonest?.due_at ?? null })
    .eq("id", leadId);
}

/** Re-sends the acknowledgement a website enquiry produces. */
export async function resendEnquiryAcknowledgement(
  leadId: string,
): Promise<ActionResult> {
  const guard = await guardLead(leadId);
  if (isGuardFailure(guard)) return guard;

  const result = await sendTemplateEmail({
    templateKey: "ENQUIRY_RECEIVED",
    to: { email: guard.lead.email, name: guard.lead.full_name },
    vars: {
      applicant_name: guard.lead.full_name,
      lead_number: guard.lead.lead_number,
    },
    leadId,
    triggeredBy: guard.profile.id,
  });

  refreshLead(leadId);
  return result.status === "SENT"
    ? { ok: true }
    : { ok: false, message: "The email could not be sent. Check the email logs." };
}
