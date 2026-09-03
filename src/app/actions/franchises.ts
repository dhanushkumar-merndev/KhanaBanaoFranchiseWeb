"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import {
  SETUP_CHECKLIST,
  STORAGE_BUCKETS,
  TRAINING_STATUSES,
  type LeadStatus,
  type TrainingStatus,
} from "@/lib/domain/enums";
import { canApproveFranchise, canTransition } from "@/lib/domain/transitions";
import { overallDocumentStatus } from "@/lib/domain/documents";
import {
  storedFileAttachment,
  type EmailAttachment,
} from "@/lib/email/attachments";
import { sendTemplateEmail } from "@/lib/email/send";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  approvalLetterPath,
  checkUpload,
  MAX_AGREEMENT_BYTES,
  ALLOWED_AGREEMENT_TYPES,
  removeFile,
  signedUrlFor,
  uploadFile,
} from "@/lib/storage";
import { formatDate } from "@/lib/format";
import type { ActionResult } from "@/lib/validation/result";

function refresh(leadId: string) {
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath(`/member/leads/${leadId}`);
  revalidatePath("/admin/franchises");
  revalidatePath("/admin/training");
  revalidatePath("/admin/setup");
  revalidatePath("/admin/leads");
  revalidatePath("/admin");
}

const APPROVAL_EMAIL = {
  subject: "Congratulations — your KHANA BANAO franchise is approved",
  bodyHtml:
    '<h2 style="margin:0 0 16px;font-family:Georgia,\'Times New Roman\',serif;font-size:21px;line-height:1.3;color:#8e1218;font-weight:700;">Your franchise is approved</h2><p>Hi {{applicant_name}},</p><p>Application <strong>{{application_number}}</strong> has been approved for the territory <strong>{{territory}}</strong>. Congratulations &mdash; we are glad to have you with us.</p><p>Your official approval letter is attached to this email as a PDF.</p><p>Our team will share your franchise agreement next. Nothing is needed from you until it arrives.</p>',
} as const;

// -------------------------------------------------------------------
// Franchise approval (spec §16)
// -------------------------------------------------------------------

export type ApprovalReadiness = {
  applicationSubmitted: boolean;
  businessDiscussionRecorded: boolean;
  allDocumentsApproved: boolean;
  ready: boolean;
};

/** The three gates spec §16 requires, evaluated against live data. */
export async function checkApprovalReadiness(
  leadId: string,
): Promise<ApprovalReadiness> {
  const supabase = createAdminClient();

  const { data: application } = await supabase
    .from("applications")
    .select("id, status")
    .eq("lead_id", leadId)
    .maybeSingle();

  const { count: discussions } = await supabase
    .from("lead_activities")
    .select("id", { count: "exact", head: true })
    .eq("lead_id", leadId)
    .eq("activity_type", "BUSINESS_DISCUSSION");

  const { data: requests } = application
    ? await supabase
        .from("document_requests")
        .select("status")
        .eq("application_id", application.id)
    : { data: [] };

  const statuses = (requests ?? []).map((request) => request.status);

  const readiness = {
    applicationSubmitted: Boolean(
      application &&
      ["SUBMITTED", "UNDER_REVIEW", "APPROVED"].includes(application.status),
    ),
    businessDiscussionRecorded: (discussions ?? 0) > 0,
    // No requested documents means nothing has been verified, so this gate
    // stays shut rather than vacuously passing.
    allDocumentsApproved:
      statuses.length > 0 &&
      overallDocumentStatus(statuses) === "DOCUMENTS_APPROVED",
  };

  return { ...readiness, ready: canApproveFranchise(readiness) };
}

export async function approveFranchise(
  leadId: string,
  formData: FormData,
  sendEmail: boolean,
): Promise<ActionResult> {
  const profile = await requireAdmin();
  const supabase = createAdminClient();

  const territory = String(formData.get("territory") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();
  const investmentRaw = String(formData.get("investment") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const letter = formData.get("letter");
  const hasLetter = letter instanceof File && letter.size > 0;

  const fieldErrors: Record<string, string> = {};
  if (!territory) fieldErrors.territory = "Record the approved territory";
  if (!model) fieldErrors.model = "Record the approved franchise model";

  const investment = investmentRaw ? Number(investmentRaw) : null;
  if (investmentRaw && (!Number.isFinite(investment) || investment! < 0)) {
    fieldErrors.investment = "Enter a valid amount";
  }
  if (sendEmail && !hasLetter) {
    fieldErrors.letter = "Upload the approval letter PDF to send with this email";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      message: "Please check the highlighted fields.",
      fieldErrors,
    };
  }

  const readiness = await checkApprovalReadiness(leadId);
  if (!readiness.ready) {
    return {
      ok: false,
      message:
        "This lead has not met all three approval prerequisites yet — see the checklist above.",
    };
  }

  const { data: lead } = await supabase
    .from("leads")
    .select("id, lead_number, full_name, email, current_status")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead) return { ok: false, message: "That lead no longer exists." };

  // Older/out-of-order document reviews can leave the aggregate requests
  // approved while the lead itself is still at application review. Reconcile
  // that stale display stage before applying the guarded approval transition.
  let approvalFrom = lead.current_status as LeadStatus;
  if (
    approvalFrom === "APPLICATION_UNDER_REVIEW" &&
    readiness.allDocumentsApproved
  ) {
    await supabase
      .from("leads")
      .update({ current_status: "DOCUMENTS_APPROVED" })
      .eq("id", leadId);
    await supabase.from("lead_activities").insert({
      lead_id: leadId,
      member_id: profile.id,
      activity_type: "STATUS_CHANGE",
      previous_status: approvalFrom,
      new_status: "DOCUMENTS_APPROVED",
      notes: "Document status reconciled from approved request records.",
    });
    approvalFrom = "DOCUMENTS_APPROVED";
  }

  if (!canTransition(approvalFrom, "FRANCHISE_APPROVED")) {
    return {
      ok: false,
      message: "This lead cannot be approved from its current stage.",
    };
  }

  const { data: application } = await supabase
    .from("applications")
    .select("id, application_number")
    .eq("lead_id", leadId)
    .maybeSingle();

  if (!application)
    return { ok: false, message: "There is no application to approve." };

  let letterPath: string | null = null;
  let letterAttachment: EmailAttachment | null = null;
  if (hasLetter) {
    const check = checkUpload(letter, {
      maxBytes: MAX_AGREEMENT_BYTES,
      allowed: ALLOWED_AGREEMENT_TYPES,
    });
    if (!check.ok) {
      return {
        ok: false,
        message: check.message,
        fieldErrors: { letter: check.message },
      };
    }
    letterPath = approvalLetterPath(application.id, letter.name);
    const uploaded = await uploadFile(
      STORAGE_BUCKETS.approvalLetters,
      letterPath,
      letter,
    );
    if (!uploaded.ok) return { ok: false, message: uploaded.message };

    // The storage bucket is private for the admin record. Attach the same
    // bytes directly so the applicant receives the letter without exposing a
    // public or expiring storage URL in the email.
    letterAttachment = {
      name: letter.name || `${application.application_number}-approval-letter.pdf`,
      content: Buffer.from(await letter.arrayBuffer()).toString("base64"),
    };
  }

  await supabase
    .from("applications")
    .update({
      status: "APPROVED",
      approved_territory: territory,
      approved_franchise_model: model,
      approved_investment: investment,
      approval_notes: notes || null,
      ...(letterPath ? { approval_letter_path: letterPath } : {}),
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", application.id);

  await supabase
    .from("leads")
    .update({
      current_status: "FRANCHISE_APPROVED",
      preferred_territory: territory,
    })
    .eq("id", leadId);

  await supabase.from("lead_activities").insert({
    lead_id: leadId,
    member_id: profile.id,
    activity_type: "STATUS_CHANGE",
    previous_status: approvalFrom,
    new_status: "FRANCHISE_APPROVED",
    notes: `Approved for ${territory} (${model}).`,
    territory_discussed: territory,
  });

  // Older builds allowed an agreement to be completed before the approval
  // gates. Once those gates are genuinely satisfied, reconcile that existing
  // evidence through the normal lead stages and open Payment automatically.
  const { data: completedAgreement } = await supabase
    .from("agreements")
    .select("agreement_number")
    .eq("lead_id", leadId)
    .eq("status", "COMPLETED")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (completedAgreement) {
    const stages: { from: LeadStatus; to: LeadStatus; notes: string }[] = [
      {
        from: "FRANCHISE_APPROVED",
        to: "AGREEMENT_PENDING",
        notes: `Existing agreement ${completedAgreement.agreement_number} detected.`,
      },
      {
        from: "AGREEMENT_PENDING",
        to: "AGREEMENT_SENT",
        notes: `Agreement ${completedAgreement.agreement_number} was already sent.`,
      },
      {
        from: "AGREEMENT_SENT",
        to: "AGREEMENT_COMPLETED",
        notes: `Agreement ${completedAgreement.agreement_number} was already completed.`,
      },
      {
        from: "AGREEMENT_COMPLETED",
        to: "PAYMENT_PENDING",
        notes: "Awaiting the franchise investment payment.",
      },
    ];

    await supabase
      .from("leads")
      .update({ current_status: "PAYMENT_PENDING" })
      .eq("id", leadId);
    await supabase.from("lead_activities").insert(
      stages.map((stage) => ({
        lead_id: leadId,
        member_id: profile.id,
        activity_type: "STATUS_CHANGE" as const,
        previous_status: stage.from,
        new_status: stage.to,
        notes: stage.notes,
      })),
    );
  }

  let emailFailure: string | null = null;
  if (sendEmail) {
    const emailResult = await sendTemplateEmail({
      templateKey: "APPLICATION_APPROVED",
      to: { email: lead.email, name: lead.full_name },
      vars: {
        applicant_name: lead.full_name,
        lead_number: lead.lead_number,
        application_number: application.application_number,
        territory,
      },
      ...(letterAttachment
        ? {
            override: APPROVAL_EMAIL,
            attachments: [letterAttachment],
          }
        : {}),
      leadId,
      triggeredBy: profile.id,
    });
    if (emailResult.status !== "SENT") {
      emailFailure = emailResult.error ?? "The email provider did not accept the message.";
    }
  }

  await supabase.from("activity_logs").insert({
    actor_id: profile.id,
    entity_type: "application",
    entity_id: application.id,
    action: "FRANCHISE_APPROVED",
    summary: `${lead.lead_number} approved for ${territory}.`,
  });

  refresh(leadId);
  if (emailFailure) {
    return {
      ok: false,
      message: `Franchise approved and the letter was saved, but the email was not sent: ${emailFailure}`,
    };
  }
  return { ok: true };
}

/** Re-send an already stored approval letter without approving the lead again. */
export async function resendApprovalEmail(
  applicationId: string,
): Promise<ActionResult> {
  const profile = await requireAdmin();
  const supabase = createAdminClient();

  const { data: application } = await supabase
    .from("applications")
    .select(
      "id, lead_id, application_number, status, approved_territory, approval_letter_path",
    )
    .eq("id", applicationId)
    .maybeSingle();

  if (!application) {
    return { ok: false, message: "That application no longer exists." };
  }
  if (application.status !== "APPROVED") {
    return { ok: false, message: "Only an approved application can send this letter." };
  }
  if (!application.approval_letter_path) {
    return { ok: false, message: "No approval letter was uploaded." };
  }

  const { data: lead } = await supabase
    .from("leads")
    .select("lead_number, full_name, email")
    .eq("id", application.lead_id)
    .maybeSingle();

  if (!lead) return { ok: false, message: "That lead no longer exists." };

  const attachment = await storedFileAttachment(
    STORAGE_BUCKETS.approvalLetters,
    application.approval_letter_path,
    `${application.application_number}-approval-letter.pdf`,
  );
  if (!attachment) {
    return {
      ok: false,
      message: "The stored approval letter could not be read. Upload it again before sending.",
    };
  }

  const result = await sendTemplateEmail({
    templateKey: "APPLICATION_APPROVED",
    to: { email: lead.email, name: lead.full_name },
    vars: {
      applicant_name: lead.full_name,
      lead_number: lead.lead_number,
      application_number: application.application_number,
      territory: application.approved_territory ?? "the approved territory",
    },
    override: APPROVAL_EMAIL,
    attachments: [attachment],
    leadId: application.lead_id,
    triggeredBy: profile.id,
  });

  if (result.status !== "SENT") {
    return {
      ok: false,
      message: result.error ?? "The email provider did not accept the message.",
    };
  }

  await supabase.from("activity_logs").insert({
    actor_id: profile.id,
    entity_type: "application",
    entity_id: application.id,
    action: "APPROVAL_EMAIL_RESENT",
    summary: `${application.application_number} approval letter emailed again.`,
  });

  refresh(application.lead_id);
  return { ok: true };
}

/** Add or replace the letter after approval, optionally emailing it immediately. */
export async function uploadApprovalLetter(
  applicationId: string,
  formData: FormData,
  sendEmail: boolean,
): Promise<ActionResult> {
  const profile = await requireAdmin();
  const supabase = createAdminClient();
  const letter = formData.get("letter");

  if (!(letter instanceof File) || letter.size === 0) {
    return {
      ok: false,
      message: "Choose the approval letter PDF.",
      fieldErrors: { letter: "Choose the approval letter PDF" },
    };
  }

  const check = checkUpload(letter, {
    maxBytes: MAX_AGREEMENT_BYTES,
    allowed: ALLOWED_AGREEMENT_TYPES,
  });
  if (!check.ok) {
    return {
      ok: false,
      message: check.message,
      fieldErrors: { letter: check.message },
    };
  }

  const { data: application } = await supabase
    .from("applications")
    .select(
      "id, lead_id, application_number, status, approved_territory, approval_letter_path",
    )
    .eq("id", applicationId)
    .maybeSingle();

  if (!application) {
    return { ok: false, message: "That application no longer exists." };
  }
  if (application.status !== "APPROVED") {
    return {
      ok: false,
      message: "Approve the application before adding its approval letter.",
    };
  }

  const newPath = approvalLetterPath(application.id, letter.name);
  const uploaded = await uploadFile(
    STORAGE_BUCKETS.approvalLetters,
    newPath,
    letter,
  );
  if (!uploaded.ok) return uploaded;

  const { error: updateError } = await supabase
    .from("applications")
    .update({ approval_letter_path: newPath })
    .eq("id", application.id);

  if (updateError) {
    await removeFile(STORAGE_BUCKETS.approvalLetters, newPath);
    return { ok: false, message: updateError.message };
  }

  if (
    application.approval_letter_path &&
    application.approval_letter_path !== newPath
  ) {
    await removeFile(
      STORAGE_BUCKETS.approvalLetters,
      application.approval_letter_path,
    );
  }

  let emailFailure: string | null = null;
  if (sendEmail) {
    const { data: lead } = await supabase
      .from("leads")
      .select("lead_number, full_name, email")
      .eq("id", application.lead_id)
      .maybeSingle();

    if (!lead) {
      emailFailure = "The related lead no longer exists.";
    } else {
      const attachment: EmailAttachment = {
        name:
          letter.name || `${application.application_number}-approval-letter.pdf`,
        content: Buffer.from(await letter.arrayBuffer()).toString("base64"),
      };
      const result = await sendTemplateEmail({
        templateKey: "APPLICATION_APPROVED",
        to: { email: lead.email, name: lead.full_name },
        vars: {
          applicant_name: lead.full_name,
          lead_number: lead.lead_number,
          application_number: application.application_number,
          territory: application.approved_territory ?? "the approved territory",
        },
        override: APPROVAL_EMAIL,
        attachments: [attachment],
        leadId: application.lead_id,
        triggeredBy: profile.id,
      });
      if (result.status !== "SENT") {
        emailFailure =
          result.error ?? "The email provider did not accept the message.";
      }
    }
  }

  await supabase.from("activity_logs").insert({
    actor_id: profile.id,
    entity_type: "application",
    entity_id: application.id,
    action: application.approval_letter_path
      ? "APPROVAL_LETTER_REPLACED"
      : "APPROVAL_LETTER_UPLOADED",
    summary: `${application.application_number} approval letter ${
      application.approval_letter_path ? "replaced" : "uploaded"
    }${sendEmail && !emailFailure ? " and emailed" : ""}.`,
  });

  refresh(application.lead_id);
  if (emailFailure) {
    return {
      ok: false,
      message: `The letter was saved, but the email was not sent: ${emailFailure}`,
    };
  }
  return { ok: true };
}

export async function getApprovalLetterUrl(
  applicationId: string,
): Promise<ActionResult<{ url: string }>> {
  await requireAdmin();

  const { data: application } = await createAdminClient()
    .from("applications")
    .select("approval_letter_path")
    .eq("id", applicationId)
    .maybeSingle();

  if (!application?.approval_letter_path) {
    return { ok: false, message: "No approval letter was uploaded." };
  }

  const url = await signedUrlFor(
    STORAGE_BUCKETS.approvalLetters,
    application.approval_letter_path,
  );

  return url
    ? { ok: true, data: { url } }
    : { ok: false, message: "Could not open that file." };
}

// -------------------------------------------------------------------
// Activation (spec §19)
// -------------------------------------------------------------------

export type ActivationReadiness = {
  franchiseApproved: boolean;
  agreementCompleted: boolean;
  paymentApproved: boolean;
  ready: boolean;
};

export async function checkActivationReadiness(
  leadId: string,
): Promise<ActivationReadiness> {
  const supabase = createAdminClient();

  const [{ data: application }, { data: agreement }, { data: payment }] =
    await Promise.all([
      supabase
        .from("applications")
        .select("status")
        .eq("lead_id", leadId)
        .maybeSingle(),
      supabase
        .from("agreements")
        .select("status")
        .eq("lead_id", leadId)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("payments")
        .select("status")
        .eq("lead_id", leadId)
        .eq("status", "APPROVED")
        .limit(1)
        .maybeSingle(),
    ]);

  const readiness = {
    franchiseApproved: application?.status === "APPROVED",
    agreementCompleted: agreement?.status === "COMPLETED",
    paymentApproved: Boolean(payment),
  };

  return {
    ...readiness,
    ready:
      readiness.franchiseApproved &&
      readiness.agreementCompleted &&
      readiness.paymentApproved,
  };
}

/**
 * Turns an approved, paid-up lead into a live franchise record (spec §19).
 *
 * The franchise ID is generated by the database sequence. No password is ever
 * created or emailed here — the CRM invitation carries a setup link instead.
 */
export async function activateFranchise(
  leadId: string,
  formData: FormData,
  sendEmail: boolean,
): Promise<ActionResult<{ franchiseId: string }>> {
  const profile = await requireAdmin();
  const supabase = createAdminClient();

  const franchiseName = String(formData.get("franchiseName") ?? "").trim();
  const ownerName = String(formData.get("ownerName") ?? "").trim();
  const territory = String(formData.get("territory") ?? "").trim();
  const activationDate = String(formData.get("activationDate") ?? "").trim();
  const crmEmail = String(formData.get("crmLoginEmail") ?? "").trim();
  const dashboardUrl = String(formData.get("dashboardUrl") ?? "").trim();
  const supportContact = String(formData.get("supportContact") ?? "").trim();
  const supportOwner = String(formData.get("supportOwner") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  const fieldErrors: Record<string, string> = {};
  if (!franchiseName) fieldErrors.franchiseName = "Give the franchise a name";
  if (!ownerName) fieldErrors.ownerName = "Record the owner's name";
  if (!activationDate || Number.isNaN(new Date(activationDate).getTime())) {
    fieldErrors.activationDate = "Pick the activation date";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      message: "Please check the highlighted fields.",
      fieldErrors,
    };
  }

  const readiness = await checkActivationReadiness(leadId);
  if (!readiness.ready) {
    return {
      ok: false,
      message:
        "Approval, a completed agreement and an approved payment are all required before activation.",
    };
  }

  const { data: existing } = await supabase
    .from("franchises")
    .select("franchise_id")
    .eq("lead_id", leadId)
    .maybeSingle();

  if (existing) {
    return {
      ok: false,
      message: `This lead is already franchise ${existing.franchise_id}.`,
    };
  }

  const { data: lead } = await supabase
    .from("leads")
    .select("id, lead_number, full_name, email, phone, current_status")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead) return { ok: false, message: "That lead no longer exists." };

  const { data: franchise, error } = await supabase
    .from("franchises")
    .insert({
      lead_id: leadId,
      franchise_name: franchiseName,
      owner_name: ownerName,
      phone: lead.phone,
      email: lead.email,
      territory: territory || null,
      crm_login_email: crmEmail || lead.email,
      dashboard_url: dashboardUrl || null,
      support_owner: supportOwner || null,
      support_contact: supportContact || null,
      activation_date: activationDate,
      status: "ACTIVE",
      activated_by: profile.id,
      notes: notes || null,
    })
    .select("id, franchise_id")
    .single();

  if (error || !franchise) {
    return {
      ok: false,
      message: error?.message ?? "Could not activate the franchise.",
    };
  }

  // Seed the setup checklist so the new franchise has real work to tick off.
  await supabase.from("setup_items").insert(
    SETUP_CHECKLIST.map((label, index) => ({
      franchise_id: franchise.id,
      label,
      sort_order: index,
    })),
  );

  if (canTransition(lead.current_status, "ACTIVE")) {
    await supabase
      .from("leads")
      .update({ current_status: "ACTIVE" })
      .eq("id", leadId);
    await supabase.from("lead_activities").insert({
      lead_id: leadId,
      member_id: profile.id,
      activity_type: "STATUS_CHANGE",
      previous_status: lead.current_status,
      new_status: "ACTIVE",
      notes: `Activated as franchise ${franchise.franchise_id}.`,
    });
  }

  if (sendEmail) {
    await sendTemplateEmail({
      templateKey: "FRANCHISE_ACTIVATED",
      to: { email: lead.email, name: lead.full_name },
      vars: {
        applicant_name: lead.full_name,
        franchise_id: franchise.franchise_id,
        territory: territory || "your territory",
        dashboard_url: dashboardUrl || "",
        // A setup link, never a password (spec §19.4).
        password_setup_link: dashboardUrl || "",
        support_phone: supportContact || "",
      },
      leadId,
      triggeredBy: profile.id,
    });
  }

  await supabase.from("activity_logs").insert({
    actor_id: profile.id,
    entity_type: "franchise",
    entity_id: franchise.id,
    action: "FRANCHISE_ACTIVATED",
    summary: `${lead.lead_number} activated as ${franchise.franchise_id}.`,
  });

  refresh(leadId);
  return { ok: true, data: { franchiseId: franchise.franchise_id } };
}

// -------------------------------------------------------------------
// Training (spec §20)
// -------------------------------------------------------------------

export async function scheduleTraining(
  franchiseId: string,
  formData: FormData,
  sendEmail: boolean,
): Promise<ActionResult> {
  const profile = await requireAdmin();
  const supabase = createAdminClient();

  const trainingModule = String(formData.get("module") ?? "").trim();
  const trainer = String(formData.get("trainer") ?? "").trim();
  const scheduledAt = String(formData.get("scheduledAt") ?? "").trim();
  const venue = String(formData.get("venue") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  const fieldErrors: Record<string, string> = {};
  if (!trainingModule) fieldErrors.module = "Pick a training module";
  if (!scheduledAt || Number.isNaN(new Date(scheduledAt).getTime())) {
    fieldErrors.scheduledAt = "Pick the date and time";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      message: "Please check the highlighted fields.",
      fieldErrors,
    };
  }

  const { data: franchise } = await supabase
    .from("franchises")
    .select("id, lead_id, franchise_id, owner_name, email")
    .eq("id", franchiseId)
    .maybeSingle();

  if (!franchise)
    return { ok: false, message: "That franchise no longer exists." };

  const { error } = await supabase.from("training_records").insert({
    franchise_id: franchiseId,
    module: trainingModule,
    trainer: trainer || null,
    scheduled_at: new Date(scheduledAt).toISOString(),
    venue: venue || null,
    status: "TRAINING_SCHEDULED",
    notes: notes || null,
    created_by: profile.id,
  });

  if (error) return { ok: false, message: error.message };

  await moveLeadForTraining(
    franchise.lead_id,
    "TRAINING_SCHEDULED",
    profile.id,
  );

  if (sendEmail && franchise.email) {
    await sendTemplateEmail({
      templateKey: "TRAINING_SCHEDULED",
      to: { email: franchise.email, name: franchise.owner_name },
      vars: {
        applicant_name: franchise.owner_name,
        franchise_id: franchise.franchise_id,
        training_date: formatDate(scheduledAt),
        support_name: trainer || "",
      },
      leadId: franchise.lead_id,
      triggeredBy: profile.id,
    });
  }

  refresh(franchise.lead_id);
  return { ok: true };
}

export async function setTrainingStatus(
  recordId: string,
  status: string,
  attendance?: string,
  sendEmail = false,
): Promise<ActionResult> {
  const profile = await requireAdmin();

  if (!(TRAINING_STATUSES as readonly string[]).includes(status)) {
    return { ok: false, message: "That is not a valid training status." };
  }
  const target = status as TrainingStatus;

  const supabase = createAdminClient();

  const { data: record } = await supabase
    .from("training_records")
    .select("id, franchise_id, module")
    .eq("id", recordId)
    .maybeSingle();

  if (!record)
    return { ok: false, message: "That training record no longer exists." };

  await supabase
    .from("training_records")
    .update({
      status: target,
      attendance: attendance?.trim() || null,
      completed_at:
        target === "TRAINING_COMPLETED" ? new Date().toISOString() : null,
    })
    .eq("id", recordId);

  const { data: franchise } = await supabase
    .from("franchises")
    .select("id, lead_id, franchise_id, owner_name, email, status")
    .eq("id", record.franchise_id)
    .maybeSingle();

  if (!franchise) return { ok: true };

  // Every module has to finish before the franchise itself is trained.
  const { data: siblings } = await supabase
    .from("training_records")
    .select("status")
    .eq("franchise_id", record.franchise_id);

  const allComplete =
    (siblings ?? []).length > 0 &&
    (siblings ?? []).every((row) => row.status === "TRAINING_COMPLETED");

  const leadTarget = allComplete ? "TRAINING_COMPLETED" : target;
  await moveLeadForTraining(franchise.lead_id, leadTarget, profile.id);

  if (allComplete) {
    await supabase
      .from("franchises")
      .update({ status: "SETUP" })
      .eq("id", franchise.id);

    if (sendEmail && franchise.email) {
      await sendTemplateEmail({
        templateKey: "TRAINING_COMPLETED",
        to: { email: franchise.email, name: franchise.owner_name },
        vars: {
          applicant_name: franchise.owner_name,
          franchise_id: franchise.franchise_id,
        },
        leadId: franchise.lead_id,
        triggeredBy: profile.id,
      });
    }
  } else {
    await supabase
      .from("franchises")
      .update({ status: "TRAINING" })
      .eq("id", franchise.id);
  }

  refresh(franchise.lead_id);
  return { ok: true };
}

const TRAINING_PATH: readonly LeadStatus[] = [
  "TRAINING_PENDING",
  "TRAINING_SCHEDULED",
  "TRAINING_IN_PROGRESS",
  "TRAINING_COMPLETED",
];

/** Walks the lead one step at a time — the graph forbids jumps. */
async function moveLeadForTraining(
  leadId: string,
  target: LeadStatus,
  actorId: string,
) {
  await stepLead(leadId, target, actorId, TRAINING_PATH);
}

// -------------------------------------------------------------------
// Setup + go live (spec §20)
// -------------------------------------------------------------------

export async function toggleSetupItem(
  itemId: string,
  done: boolean,
  note?: string,
): Promise<ActionResult> {
  const profile = await requireAdmin();
  const supabase = createAdminClient();

  const { data: item } = await supabase
    .from("setup_items")
    .select("id, franchise_id")
    .eq("id", itemId)
    .maybeSingle();

  if (!item)
    return { ok: false, message: "That checklist item no longer exists." };

  await supabase
    .from("setup_items")
    .update({
      is_done: done,
      note: note?.trim() || null,
      completed_by: done ? profile.id : null,
      completed_at: done ? new Date().toISOString() : null,
    })
    .eq("id", itemId);

  const { data: items } = await supabase
    .from("setup_items")
    .select("is_done")
    .eq("franchise_id", item.franchise_id);

  const total = (items ?? []).length;
  const complete = (items ?? []).filter((row) => row.is_done).length;

  const { data: franchise } = await supabase
    .from("franchises")
    .select("id, lead_id")
    .eq("id", item.franchise_id)
    .maybeSingle();

  if (!franchise) return { ok: true };

  const target =
    complete === 0
      ? "SETUP_PENDING"
      : complete < total
        ? "SETUP_IN_PROGRESS"
        : "SETUP_COMPLETED";

  await stepLead(franchise.lead_id, target, profile.id, [
    "SETUP_PENDING",
    "SETUP_IN_PROGRESS",
    "SETUP_COMPLETED",
    "READY_TO_GO_LIVE",
  ]);

  if (target === "SETUP_COMPLETED") {
    await stepLead(franchise.lead_id, "READY_TO_GO_LIVE", profile.id, [
      "SETUP_COMPLETED",
      "READY_TO_GO_LIVE",
    ]);
    await supabase
      .from("franchises")
      .update({ status: "READY_TO_GO_LIVE" })
      .eq("id", franchise.id);
  } else {
    await supabase
      .from("franchises")
      .update({ status: "SETUP" })
      .eq("id", franchise.id);
  }

  refresh(franchise.lead_id);
  return { ok: true };
}

export async function goLive(
  franchiseId: string,
  formData: FormData,
  sendEmail: boolean,
): Promise<ActionResult> {
  const profile = await requireAdmin();
  const supabase = createAdminClient();

  const goLiveDate = String(formData.get("goLiveDate") ?? "").trim();
  const supportOwner = String(formData.get("supportOwner") ?? "").trim();
  const remarks = String(formData.get("remarks") ?? "").trim();

  if (!goLiveDate || Number.isNaN(new Date(goLiveDate).getTime())) {
    return {
      ok: false,
      message: "Pick the go-live date.",
      fieldErrors: { goLiveDate: "Required" },
    };
  }

  const { data: franchise } = await supabase
    .from("franchises")
    .select("id, lead_id, franchise_id, owner_name, email, territory, status")
    .eq("id", franchiseId)
    .maybeSingle();

  if (!franchise)
    return { ok: false, message: "That franchise no longer exists." };
  if (franchise.status === "LIVE" || franchise.status === "ONGOING_SUPPORT") {
    return { ok: false, message: "That franchise is already live." };
  }

  // Going live with an unfinished checklist is the one thing this gate exists
  // to prevent, so it is re-checked here rather than trusted from the UI.
  const { count: outstanding } = await supabase
    .from("setup_items")
    .select("id", { count: "exact", head: true })
    .eq("franchise_id", franchiseId)
    .eq("is_done", false);

  if ((outstanding ?? 0) > 0) {
    return {
      ok: false,
      message: `${outstanding} setup item(s) are still outstanding. Finish the checklist before going live.`,
    };
  }

  await supabase
    .from("franchises")
    .update({
      status: "LIVE",
      go_live_date: goLiveDate,
      support_owner: supportOwner || null,
      remarks: remarks || null,
    })
    .eq("id", franchiseId);

  await stepLead(franchise.lead_id, "LIVE", profile.id, [
    "READY_TO_GO_LIVE",
    "LIVE",
  ]);

  if (sendEmail && franchise.email) {
    await sendTemplateEmail({
      templateKey: "GO_LIVE_CONFIRMATION",
      to: { email: franchise.email, name: franchise.owner_name },
      vars: {
        applicant_name: franchise.owner_name,
        franchise_id: franchise.franchise_id,
        territory: franchise.territory ?? "",
      },
      leadId: franchise.lead_id,
      triggeredBy: profile.id,
    });
  }

  await supabase.from("activity_logs").insert({
    actor_id: profile.id,
    entity_type: "franchise",
    entity_id: franchiseId,
    action: "FRANCHISE_LIVE",
    summary: `${franchise.franchise_id} went live on ${formatDate(goLiveDate)}.`,
  });

  refresh(franchise.lead_id);
  return { ok: true };
}

export async function moveToOngoingSupport(
  franchiseId: string,
): Promise<ActionResult> {
  const profile = await requireAdmin();
  const supabase = createAdminClient();

  const { data: franchise } = await supabase
    .from("franchises")
    .select("id, lead_id, franchise_id, status")
    .eq("id", franchiseId)
    .maybeSingle();

  if (!franchise)
    return { ok: false, message: "That franchise no longer exists." };
  if (franchise.status !== "LIVE") {
    return {
      ok: false,
      message: "Only a live franchise moves to ongoing support.",
    };
  }

  await supabase
    .from("franchises")
    .update({ status: "ONGOING_SUPPORT" })
    .eq("id", franchiseId);

  await stepLead(franchise.lead_id, "ONGOING_SUPPORT", profile.id, [
    "LIVE",
    "ONGOING_SUPPORT",
  ]);

  refresh(franchise.lead_id);
  return { ok: true };
}

/** Walks a lead along a known path, one legal transition at a time. */
async function stepLead(
  leadId: string,
  target: LeadStatus,
  actorId: string,
  path: readonly LeadStatus[],
) {
  const supabase = createAdminClient();
  const { data: lead } = await supabase
    .from("leads")
    .select("current_status")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead) return;

  let current = lead.current_status;
  const targetIndex = path.indexOf(target);
  if (targetIndex < 0) return;

  for (const step of path.slice(0, targetIndex + 1)) {
    if (current === step) continue;
    if (!canTransition(current, step)) continue;
    await supabase
      .from("leads")
      .update({ current_status: step })
      .eq("id", leadId);
    await supabase.from("lead_activities").insert({
      lead_id: leadId,
      member_id: actorId,
      activity_type: "STATUS_CHANGE",
      previous_status: current,
      new_status: step,
      notes: "Franchise progress.",
    });
    current = step;
  }
}
