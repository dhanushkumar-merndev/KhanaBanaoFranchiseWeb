"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireProfile } from "@/lib/auth/session";
import { isAdmin } from "@/lib/domain/permissions";
import { canTransition } from "@/lib/domain/transitions";
import { normalizeEmail, normalizePhone, normalizeText } from "@/lib/domain/normalize";
import { sendTemplateEmail } from "@/lib/email/send";
import { appUrl } from "@/lib/env";
import { resolveToken } from "@/lib/data/tokens";
import { createAdminClient } from "@/lib/supabase/admin";
import { applicationUrl, createToken, hashToken } from "@/lib/tokens";
import {
  applicationSchema,
  type ApplicationInput,
} from "@/lib/validation/application";
import { invalid, type ActionResult } from "@/lib/validation/result";

function blank(value: string | undefined | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function refresh(leadId: string) {
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath(`/member/leads/${leadId}`);
  revalidatePath("/admin/applications");
  revalidatePath("/member/applications");
  revalidatePath("/admin/leads");
}

const LINK_TTL_DAYS = 30;

/**
 * Issue (or reissue) the applicant's secure application link (spec §13).
 *
 * Any previous APPLICATION token is revoked first, so a forwarded old link
 * stops working the moment a new one is sent.
 */
export async function sendApplicationLink(
  leadId: string,
  sendEmail = true,
): Promise<ActionResult<{ url: string; emailSent: boolean }>> {
  const profile = await requireProfile();
  const supabase = createAdminClient();

  const { data: lead } = await supabase
    .from("leads")
    .select("id, lead_number, full_name, email, current_status, assigned_member_id")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead) return { ok: false, message: "That lead no longer exists." };
  if (!isAdmin(profile.role) && lead.assigned_member_id !== profile.id) {
    return { ok: false, message: "That lead is not assigned to you." };
  }

  const { count: discussions } = await supabase
    .from("lead_activities")
    .select("id", { count: "exact", head: true })
    .eq("lead_id", leadId)
    .eq("activity_type", "BUSINESS_DISCUSSION");
  if ((discussions ?? 0) === 0) {
    return {
      ok: false,
      message: "Record the business discussion before sending the application link.",
    };
  }

  const already = lead.current_status === "APPLICATION_LINK_SENT";
  if (!already && !canTransition(lead.current_status, "APPLICATION_LINK_SENT")) {
    return {
      ok: false,
      message: "Accept the lead before sending the application link.",
    };
  }

  // The application row is created up front so the applicant's first save has
  // somewhere to go and the application number exists from the start.
  let { data: application } = await supabase
    .from("applications")
    .select("id, application_number, status")
    .eq("lead_id", leadId)
    .maybeSingle();

  if (application?.status === "SUBMITTED" || application?.status === "APPROVED") {
    return {
      ok: false,
      message: "This applicant has already submitted their application.",
    };
  }

  if (!application) {
    const { data: created, error } = await supabase
      .from("applications")
      .insert({ lead_id: leadId })
      .select("id, application_number, status")
      .single();
    if (error || !created) {
      return { ok: false, message: error?.message ?? "Could not start the application." };
    }
    application = created;
  }

  await supabase
    .from("application_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("lead_id", leadId)
    .eq("purpose", "APPLICATION")
    .is("revoked_at", null);

  const token = createToken("APPLICATION");
  const { error: tokenError } = await supabase.from("application_tokens").insert({
    lead_id: leadId,
    application_id: application.id,
    token_hash: hashToken(token),
    purpose: "APPLICATION",
    expires_at: new Date(
      Date.now() + LINK_TTL_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString(),
    created_by: profile.id,
  });

  if (tokenError) return { ok: false, message: tokenError.message };

  const url = applicationUrl(appUrl, token);

  let emailSent = false;
  if (sendEmail) {
    const result = await sendTemplateEmail({
      templateKey: "APPLICATION_LINK",
      to: { email: lead.email, name: lead.full_name },
      vars: {
        applicant_name: lead.full_name,
        lead_number: lead.lead_number,
        application_number: application.application_number,
        application_link: url,
      },
      leadId,
      triggeredBy: profile.id,
    });
    emailSent = result.status === "SENT";
  }

  if (!already) {
    await supabase
      .from("leads")
      .update({ current_status: "APPLICATION_LINK_SENT" })
      .eq("id", leadId);

    await supabase.from("lead_activities").insert({
      lead_id: leadId,
      member_id: profile.id,
      activity_type: "STATUS_CHANGE",
      previous_status: lead.current_status,
      new_status: "APPLICATION_LINK_SENT",
      notes: "Application link issued.",
    });
  }

  await supabase.from("activity_logs").insert({
    actor_id: profile.id,
    entity_type: "application",
    entity_id: application.id,
    action: "APPLICATION_LINK_SENT",
    summary: `Application link issued for ${lead.lead_number}.`,
  });

  refresh(leadId);
  return { ok: true, data: { url, emailSent } };
}

/**
 * Applicant submission. Authenticated by the token alone — there is no session
 * here, so every check that matters happens in this function.
 */
export async function submitApplication(
  token: string,
  input: ApplicationInput,
): Promise<ActionResult<{ applicationNumber: string; submittedAt: string }>> {
  const resolved = await resolveToken(token, "APPLICATION");
  if (!resolved.ok) {
    return { ok: false, message: "This link is no longer valid." };
  }

  const { lead, application, leadId } = resolved.data;

  // Duplicate-submission guard (spec §13). Checked server-side because the
  // page-level guard only stops someone who reloads the page.
  if (application && application.status !== "IN_PROGRESS") {
    return {
      ok: false,
      message: "This application has already been submitted.",
    };
  }

  const parsed = applicationSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);

  const values = parsed.data;
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const payload = {
    personal_details: {
      full_name: normalizeText(values.fullName),
      mobile: normalizePhone(values.mobile),
      whatsapp: values.whatsapp ? normalizePhone(values.whatsapp) : null,
      email: normalizeEmail(values.email),
      date_of_birth: values.dateOfBirth,
    },
    address_details: {
      current_address: normalizeText(values.currentAddress),
      city: normalizeText(values.city),
      state: normalizeText(values.state),
      pin_code: values.pinCode.trim(),
    },
    business_details: {
      current_occupation: normalizeText(values.currentOccupation),
      business_experience: blank(values.businessExperience),
      company_name: blank(values.companyName),
      gst_number: values.gstNumber ? values.gstNumber.trim().toUpperCase() : null,
    },
    franchise_details: {
      preferred_city: normalizeText(values.preferredCity),
      preferred_territory: blank(values.preferredTerritory),
      investment_budget: normalizeText(values.investmentBudget),
      franchise_model: blank(values.franchiseModel),
      expected_start_date: blank(values.expectedStartDate),
    },
    financial_details: {
      source_of_investment: normalizeText(values.sourceOfInvestment),
      available_investment_amount: normalizeText(values.availableInvestmentAmount),
      bank_name: blank(values.bankName),
    },
    declaration: {
      information_true: true,
      consent_to_verification: true,
      terms_accepted: true,
      accepted_at: now,
    },
    status: "SUBMITTED" as const,
    submitted_at: now,
  };

  // Conditional on status so two tabs racing produce one submission, not two.
  const { data: updated, error } = application
    ? await supabase
        .from("applications")
        .update(payload)
        .eq("id", application.id)
        .eq("status", "IN_PROGRESS")
        .select("application_number, submitted_at")
        .maybeSingle()
    : await supabase
        .from("applications")
        .insert({ lead_id: leadId, ...payload })
        .select("application_number, submitted_at")
        .single();

  if (error) return { ok: false, message: error.message };
  if (!updated) {
    return { ok: false, message: "This application has already been submitted." };
  }

  await supabase
    .from("leads")
    .update({ current_status: "APPLICATION_SUBMITTED" })
    .eq("id", leadId);

  await supabase.from("lead_activities").insert({
    lead_id: leadId,
    member_id: null,
    activity_type: "STATUS_CHANGE",
    previous_status: lead.current_status,
    new_status: "APPLICATION_SUBMITTED",
    notes: "Applicant submitted the franchise application.",
  });

  await sendTemplateEmail({
    templateKey: "APPLICATION_SUBMITTED",
    to: { email: lead.email, name: lead.full_name },
    vars: {
      applicant_name: lead.full_name,
      lead_number: lead.lead_number,
      application_number: updated.application_number,
    },
    leadId,
  });

  refresh(leadId);
  return {
    ok: true,
    data: {
      applicationNumber: updated.application_number,
      submittedAt: updated.submitted_at ?? now,
    },
  };
}

/** Moves a submitted application into review so the queue reflects reality. */
export async function startApplicationReview(
  applicationId: string,
): Promise<ActionResult> {
  const profile = await requireAdmin();
  const supabase = createAdminClient();

  const { data: application } = await supabase
    .from("applications")
    .select("id, lead_id, status")
    .eq("id", applicationId)
    .maybeSingle();

  if (!application) return { ok: false, message: "That application no longer exists." };
  if (application.status !== "SUBMITTED") {
    return { ok: false, message: "Only a submitted application can be opened for review." };
  }

  await supabase
    .from("applications")
    .update({
      status: "UNDER_REVIEW",
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  const { data: lead } = await supabase
    .from("leads")
    .select("current_status")
    .eq("id", application.lead_id)
    .maybeSingle();

  if (lead && canTransition(lead.current_status, "APPLICATION_UNDER_REVIEW")) {
    await supabase
      .from("leads")
      .update({ current_status: "APPLICATION_UNDER_REVIEW" })
      .eq("id", application.lead_id);

    await supabase.from("lead_activities").insert({
      lead_id: application.lead_id,
      member_id: profile.id,
      activity_type: "STATUS_CHANGE",
      previous_status: lead.current_status,
      new_status: "APPLICATION_UNDER_REVIEW",
      notes: "Application opened for review.",
    });
  }

  refresh(application.lead_id);
  return { ok: true };
}

export async function rejectApplication(
  applicationId: string,
  reason: string,
  sendEmail: boolean,
): Promise<ActionResult> {
  const profile = await requireAdmin();

  const trimmed = reason.trim();
  if (trimmed.length < 5) {
    return {
      ok: false,
      message: "A rejection reason is required.",
      fieldErrors: { reason: "Say why this application was rejected" },
    };
  }

  const supabase = createAdminClient();

  const { data: application } = await supabase
    .from("applications")
    .select("id, lead_id, application_number, status")
    .eq("id", applicationId)
    .maybeSingle();

  if (!application) return { ok: false, message: "That application no longer exists." };

  const { data: lead } = await supabase
    .from("leads")
    .select("id, lead_number, full_name, email, current_status")
    .eq("id", application.lead_id)
    .maybeSingle();

  if (!lead) return { ok: false, message: "That lead no longer exists." };
  if (!canTransition(lead.current_status, "REJECTED")) {
    return { ok: false, message: "This lead has moved too far along to reject here." };
  }

  await supabase
    .from("applications")
    .update({
      status: "REJECTED",
      review_notes: trimmed,
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  await supabase
    .from("leads")
    .update({ current_status: "REJECTED", rejection_reason: trimmed })
    .eq("id", lead.id);

  await supabase.from("lead_activities").insert({
    lead_id: lead.id,
    member_id: profile.id,
    activity_type: "STATUS_CHANGE",
    previous_status: lead.current_status,
    new_status: "REJECTED",
    notes: trimmed,
  });

  await supabase
    .from("followups")
    .update({ status: "CANCELLED" })
    .eq("lead_id", lead.id)
    .eq("status", "PENDING");

  if (sendEmail) {
    await sendTemplateEmail({
      templateKey: "APPLICATION_REJECTED",
      to: { email: lead.email, name: lead.full_name },
      vars: {
        applicant_name: lead.full_name,
        lead_number: lead.lead_number,
        application_number: application.application_number,
        reupload_reason: trimmed,
      },
      leadId: lead.id,
      triggeredBy: profile.id,
    });
  }

  refresh(lead.id);
  return { ok: true };
}
