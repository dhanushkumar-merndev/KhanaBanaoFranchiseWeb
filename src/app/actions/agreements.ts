"use server";

import { revalidatePath } from "next/cache";
import {
  requireAdmin,
  requireProfile,
  type SessionProfile,
} from "@/lib/auth/session";
import { AGREEMENT_DOCUMENT_VERSION, CLAUSE_BY_ID } from "@/lib/agreement/clauses";
import { missingRequiredFields, pickKnownFields } from "@/lib/agreement/fields";
import { renderFullDocument } from "@/lib/agreement/render";
import { loadAgreementDocument } from "@/lib/data/agreement-document";
import { isAdmin } from "@/lib/domain/permissions";
import { appUrl } from "@/lib/env";
import { agreementUrl, createToken, hashToken } from "@/lib/tokens";
import {
  AGREEMENT_STATUSES,
  LEAD_STATUSES,
  STORAGE_BUCKETS,
  type AgreementStatus,
  type LeadStatus,
} from "@/lib/domain/enums";
import { canTransition } from "@/lib/domain/transitions";
import {
  createDirectUploadReceipt,
  readDirectUploadReceipt,
} from "@/lib/direct-upload-receipt";
import {
  BROCHURE_ATTACHMENT,
  storedFileAttachment,
} from "@/lib/email/attachments";
import { sendTemplateEmail } from "@/lib/email/send";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ALLOWED_AGREEMENT_TYPES,
  MAX_AGREEMENT_BYTES,
  agreementPath,
  removeFile,
  signedUrlFor,
} from "@/lib/storage";
import { AGREEMENT_STATUS_LABELS } from "@/lib/domain/status";
import type { ActionResult } from "@/lib/validation/result";

function refresh(leadId: string) {
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath(`/member/leads/${leadId}`);
  revalidatePath("/admin/agreements");
  revalidatePath("/admin/leads");
}

/** Timestamp column each status owns, so the page can show real dates. */
const STAMP_FOR: Partial<Record<AgreementStatus, string>> = {
  SENT: "sent_at",
  SIGNED_BY_APPLICANT: "applicant_signed_at",
  SIGNED_BY_COMPANY: "company_signed_at",
  COMPLETED: "completed_at",
};

/**
 * Agreements advance in a fixed order. Skipping a step would leave the
 * timestamps inconsistent with the status, so the order is enforced here.
 */
const ORDER: AgreementStatus[] = [
  "PENDING",
  "UPLOADED",
  "SENT",
  "SIGNED_BY_APPLICANT",
  "SIGNED_BY_COMPANY",
  "COMPLETED",
];
const AGREEMENT_UPLOAD_PURPOSE = "AGREEMENT_FILE";
const UPLOAD_RECEIPT_TTL_MS = 15 * 60 * 1000;

export type AgreementUploadMetadata = {
  fileName: string;
  fileSize: number;
  mimeType: string;
};

function agreementMetadataError(file: AgreementUploadMetadata): string | null {
  if (!file.fileName.trim()) return "Choose the agreement PDF.";
  if (!Number.isSafeInteger(file.fileSize) || file.fileSize <= 0) {
    return "That file is empty.";
  }
  if (file.fileSize > MAX_AGREEMENT_BYTES) {
    return `That file is ${(file.fileSize / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_AGREEMENT_BYTES / 1024 / 1024} MB.`;
  }
  if (!(ALLOWED_AGREEMENT_TYPES as readonly string[]).includes(file.mimeType)) {
    return "Only PDF files are accepted here.";
  }
  return null;
}

function agreementStageIsAvailable(status: LeadStatus): boolean {
  return (
    status !== "REJECTED" &&
    LEAD_STATUSES.indexOf(status) >= LEAD_STATUSES.indexOf("FRANCHISE_APPROVED")
  );
}

/** Returns a path-bound token; agreement bytes go browser → Supabase. */
export async function prepareAgreementUpload(
  leadId: string,
  file: AgreementUploadMetadata,
): Promise<
  ActionResult<{ path: string; uploadToken: string; receipt: string }>
> {
  const profile = await requireAdmin();
  const metadataError = agreementMetadataError(file);
  if (metadataError) return { ok: false, message: metadataError };

  const supabase = createAdminClient();
  const { data: lead } = await supabase
    .from("leads")
    .select("id, current_status")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) return { ok: false, message: "That lead no longer exists." };
  if (!agreementStageIsAvailable(lead.current_status)) {
    return {
      ok: false,
      message:
        "Finish document review and approve the franchise before managing its agreement.",
    };
  }

  const { data: existing } = await supabase
    .from("agreements")
    .select("id, version, status")
    .eq("lead_id", leadId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const startNewVersion = existing?.status === "COMPLETED";
  const version = existing ? existing.version + (startNewVersion ? 1 : 0) : 1;
  const fileName = file.fileName.trim().slice(0, 200);
  const path = agreementPath(leadId, version, fileName);
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS.agreements)
    .createSignedUploadUrl(path);
  if (error || !data?.token) {
    return { ok: false, message: "Could not prepare the secure agreement upload." };
  }

  const receipt = createDirectUploadReceipt({
    purpose: AGREEMENT_UPLOAD_PURPOSE,
    bucket: STORAGE_BUCKETS.agreements,
    path,
    ownerId: leadId,
    actorId: profile.id,
    fileName,
    fileSize: file.fileSize,
    mimeType: file.mimeType,
    expiresAt: Date.now() + UPLOAD_RECEIPT_TTL_MS,
    attributes: {
      version,
      existingId: existing?.id ?? null,
      startNewVersion,
    },
  });
  return { ok: true, data: { path, uploadToken: data.token, receipt } };
}

export async function discardAgreementUpload(
  leadId: string,
  receipt: string,
): Promise<ActionResult> {
  const profile = await requireAdmin();
  const upload = readDirectUploadReceipt(receipt, AGREEMENT_UPLOAD_PURPOSE);
  if (
    !upload ||
    upload.ownerId !== leadId ||
    upload.actorId !== profile.id ||
    upload.bucket !== STORAGE_BUCKETS.agreements
  ) {
    return { ok: false, message: "That upload confirmation is invalid." };
  }

  const supabase = createAdminClient();
  const { data: registered } = await supabase
    .from("agreements")
    .select("id")
    .eq("storage_path", upload.path)
    .maybeSingle();
  if (!registered) await removeFile(STORAGE_BUCKETS.agreements, upload.path);
  return { ok: true };
}

export async function uploadAgreement(
  leadId: string,
  receipt: string,
  notesValue: string,
): Promise<ActionResult<{ agreementNumber: string }>> {
  const profile = await requireAdmin();
  const notes = notesValue.trim();

  const supabase = createAdminClient();

  const { data: lead } = await supabase
    .from("leads")
    .select("id, lead_number, current_status")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead) return { ok: false, message: "That lead no longer exists." };
  if (!agreementStageIsAvailable(lead.current_status)) {
    return {
      ok: false,
      message:
        "Finish document review and approve the franchise before managing its agreement.",
    };
  }

  const { data: existing } = await supabase
    .from("agreements")
    .select("id, version, storage_path, status")
    .eq("lead_id", leadId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  // A completed agreement is a signed contract; replacing it silently would
  // destroy the record, so a new version is started instead.
  const startNewVersion = existing?.status === "COMPLETED";
  const version = existing ? existing.version + (startNewVersion ? 1 : 0) : 1;
  const upload = readDirectUploadReceipt(receipt, AGREEMENT_UPLOAD_PURPOSE);
  const invalid =
    !upload ||
    upload.ownerId !== leadId ||
    upload.actorId !== profile.id ||
    upload.bucket !== STORAGE_BUCKETS.agreements ||
    upload.expiresAt < Date.now() ||
    agreementMetadataError({
      fileName: upload.fileName,
      fileSize: upload.fileSize,
      mimeType: upload.mimeType,
    }) !== null ||
    upload.attributes?.version !== version ||
    upload.attributes?.existingId !== (existing?.id ?? null) ||
    upload.attributes?.startNewVersion !== startNewVersion;
  if (invalid || !upload) {
    return {
      ok: false,
      message: "The secure agreement upload expired. Please choose the file again.",
    };
  }

  const { data: object, error: objectError } = await supabase.storage
    .from(STORAGE_BUCKETS.agreements)
    .info(upload.path);
  if (
    objectError ||
    object?.size !== upload.fileSize ||
    object.contentType !== upload.mimeType
  ) {
    await removeFile(STORAGE_BUCKETS.agreements, upload.path);
    return {
      ok: false,
      message: "The agreement did not upload correctly. Please try again.",
    };
  }

  const path = upload.path;

  const values = {
    version,
    storage_path: path,
    file_name: upload.fileName,
    status: "UPLOADED" as const,
    notes: notes || null,
    created_by: profile.id,
  };

  const { data: agreement, error } =
    existing && !startNewVersion
      ? await supabase
          .from("agreements")
          .update(values)
          .eq("id", existing.id)
          .select("agreement_number")
          .single()
      : await supabase
          .from("agreements")
          .insert({ lead_id: leadId, ...values })
          .select("agreement_number")
          .single();

  if (error || !agreement) {
    await removeFile(STORAGE_BUCKETS.agreements, path);
    return { ok: false, message: error?.message ?? "Could not save the agreement." };
  }

  if (existing?.storage_path && !startNewVersion) {
    await removeFile(STORAGE_BUCKETS.agreements, existing.storage_path);
  }

  if (canTransition(lead.current_status, "AGREEMENT_PENDING")) {
    await supabase
      .from("leads")
      .update({ current_status: "AGREEMENT_PENDING" })
      .eq("id", leadId);
    await supabase.from("lead_activities").insert({
      lead_id: leadId,
      member_id: profile.id,
      activity_type: "STATUS_CHANGE",
      previous_status: lead.current_status,
      new_status: "AGREEMENT_PENDING",
      notes: `Agreement ${agreement.agreement_number} uploaded.`,
    });
  }

  await supabase.from("activity_logs").insert({
    actor_id: profile.id,
    entity_type: "agreement",
    entity_id: agreement.agreement_number,
    action: "AGREEMENT_UPLOADED",
    summary: `Uploaded agreement ${agreement.agreement_number} for ${lead.lead_number}.`,
  });

  refresh(leadId);
  return { ok: true, data: { agreementNumber: agreement.agreement_number } };
}

export async function advanceAgreement(
  agreementId: string,
  nextStatus: string,
  sendEmail: boolean,
  note?: string,
): Promise<ActionResult> {
  const profile = await requireAdmin();

  if (!(AGREEMENT_STATUSES as readonly string[]).includes(nextStatus)) {
    return { ok: false, message: "That is not a valid agreement status." };
  }
  const target = nextStatus as AgreementStatus;

  const supabase = createAdminClient();

  const { data: agreement } = await supabase
    .from("agreements")
    .select("id, lead_id, agreement_number, status, storage_path, file_name")
    .eq("id", agreementId)
    .maybeSingle();

  if (!agreement) return { ok: false, message: "That agreement no longer exists." };

  const { data: lead } = await supabase
    .from("leads")
    .select("id, lead_number, full_name, email, current_status")
    .eq("id", agreement.lead_id)
    .maybeSingle();

  if (!lead) return { ok: false, message: "That lead no longer exists." };
  if (!agreementStageIsAvailable(lead.current_status)) {
    return {
      ok: false,
      message:
        "Finish document review and approve the franchise before advancing its agreement.",
    };
  }

  const currentIndex = ORDER.indexOf(agreement.status);
  const targetIndex = ORDER.indexOf(target);

  if (targetIndex <= currentIndex) {
    return {
      ok: false,
      message: `This agreement is already at "${AGREEMENT_STATUS_LABELS[agreement.status]}".`,
    };
  }
  if (targetIndex !== currentIndex + 1) {
    return {
      ok: false,
      message: `Move to "${AGREEMENT_STATUS_LABELS[ORDER[currentIndex + 1]]}" first — the stages run in order.`,
    };
  }
  if (target !== "UPLOADED" && !agreement.storage_path) {
    return { ok: false, message: "Upload the agreement document first." };
  }

  const now = new Date().toISOString();
  const stampColumn = STAMP_FOR[target];

  await supabase
    .from("agreements")
    .update({
      status: target,
      ...(stampColumn ? { [stampColumn]: now } : {}),
      ...(note?.trim() ? { notes: note.trim() } : {}),
    })
    .eq("id", agreementId);

  // Only two agreement stages move the lead itself.
  const leadTarget =
    target === "SENT"
      ? "AGREEMENT_SENT"
      : target === "COMPLETED"
        ? "AGREEMENT_COMPLETED"
        : null;

  if (leadTarget && canTransition(lead.current_status, leadTarget)) {
    await supabase
      .from("leads")
      .update({ current_status: leadTarget })
      .eq("id", lead.id);
    await supabase.from("lead_activities").insert({
      lead_id: lead.id,
      member_id: profile.id,
      activity_type: "STATUS_CHANGE",
      previous_status: lead.current_status,
      new_status: leadTarget,
      notes: `Agreement ${agreement.agreement_number}: ${AGREEMENT_STATUS_LABELS[target].toLowerCase()}.`,
    });
  }

  // Completing the agreement opens the payment stage.
  if (target === "COMPLETED") {
    const { data: after } = await supabase
      .from("leads")
      .select("current_status")
      .eq("id", lead.id)
      .maybeSingle();

    if (after && canTransition(after.current_status, "PAYMENT_PENDING")) {
      await supabase
        .from("leads")
        .update({ current_status: "PAYMENT_PENDING" })
        .eq("id", lead.id);
      await supabase.from("lead_activities").insert({
        lead_id: lead.id,
        member_id: profile.id,
        activity_type: "STATUS_CHANGE",
        previous_status: after.current_status,
        new_status: "PAYMENT_PENDING",
        notes: "Awaiting the franchise investment payment.",
      });
    }
  }

  if (sendEmail && target === "SENT") {
    // Both routes to SENT — this one and sendAgreementDocument — go through
    // the same delivery, so the AGREEMENT_SENT template can rely on
    // {{application_link}} always being supplied.
    const delivery = await deliverAgreementEmail({
      agreementId,
      agreementNumber: agreement.agreement_number,
      leadId: lead.id,
      leadNumber: lead.lead_number,
      toEmail: lead.email,
      toName: lead.full_name,
      storagePath: agreement.storage_path,
      fileName: agreement.file_name,
      actorId: profile.id,
    });
    if (!delivery.ok) return delivery;
  }

  await supabase.from("activity_logs").insert({
    actor_id: profile.id,
    entity_type: "agreement",
    entity_id: agreementId,
    action: `AGREEMENT_${target}`,
    summary: `${agreement.agreement_number} → ${AGREEMENT_STATUS_LABELS[target]}.`,
  });

  refresh(lead.id);
  return { ok: true };
}

export async function getAgreementUrl(
  agreementId: string,
  download = false,
): Promise<ActionResult<{ url: string }>> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: agreement } = await supabase
    .from("agreements")
    .select("storage_path, file_name")
    .eq("id", agreementId)
    .maybeSingle();

  if (!agreement?.storage_path) {
    return { ok: false, message: "No agreement file has been uploaded yet." };
  }

  const url = await signedUrlFor(STORAGE_BUCKETS.agreements, agreement.storage_path, {
    download: download ? (agreement.file_name ?? "agreement.pdf") : undefined,
  });

  return url
    ? { ok: true, data: { url } }
    : { ok: false, message: "Could not open that file." };
}

/**
 * Mint the applicant's link and send the agreement email.
 *
 * Shared by both routes to SENT: advancing an uploaded agreement, and sending
 * the generated document. Whichever route was taken, the applicant gets a link
 * to the same page, plus the signed-copy PDF as an attachment where one has
 * been uploaded.
 *
 * Any earlier link for this agreement is revoked first — re-sending must not
 * leave a superseded set of terms reachable.
 */
async function deliverAgreementEmail(args: {
  agreementId: string;
  agreementNumber: string;
  leadId: string;
  leadNumber: string;
  toEmail: string;
  toName: string;
  storagePath?: string | null;
  fileName?: string | null;
  actorId: string;
}): Promise<
  | { ok: true; url: string; emailSent: boolean }
  | { ok: false; message: string }
> {
  const supabase = createAdminClient();

  // Create the replacement before revoking the old link. A transient database
  // failure must not leave the applicant with no working agreement at all.
  const token = createToken("AGREEMENT");
  const { data: createdToken, error: tokenError } = await supabase
    .from("application_tokens")
    .insert({
      lead_id: args.leadId,
      agreement_id: args.agreementId,
      token_hash: hashToken(token),
      purpose: "AGREEMENT",
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      created_by: args.actorId,
    })
    .select("id")
    .single();

  if (tokenError || !createdToken) {
    return {
      ok: false,
      message: tokenError?.message ?? "Could not create the applicant link.",
    };
  }

  await supabase
    .from("application_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("agreement_id", args.agreementId)
    .neq("id", createdToken.id)
    .is("revoked_at", null);

  const url = agreementUrl(appUrl, token);

  const uploaded = args.storagePath
    ? await storedFileAttachment(
        STORAGE_BUCKETS.agreements,
        args.storagePath,
        args.fileName ?? `${args.agreementNumber}.pdf`,
      )
    : null;

  const delivery = await sendTemplateEmail({
    templateKey: "AGREEMENT_SENT",
    to: { email: args.toEmail, name: args.toName },
    vars: {
      applicant_name: args.toName,
      lead_number: args.leadNumber,
      agreement_number: args.agreementNumber,
      application_link: url,
    },
    // Preserve the brochure that the existing agreement email included while
    // adding the private generated-document link.
    attachments: [uploaded, BROCHURE_ATTACHMENT],
    leadId: args.leadId,
    triggeredBy: args.actorId,
  });

  await supabase
    .from("agreements")
    .update({
      document_sent_at: new Date().toISOString(),
      document_version: AGREEMENT_DOCUMENT_VERSION,
    })
    .eq("id", args.agreementId);

  return { ok: true, url, emailSent: delivery.status === "SENT" };
}

// ===================================================================
// Generated agreement document
//
// The agreement is produced from the applicant's own answers rather than
// uploaded as a filled-in PDF. Members may prepare and send it for leads
// assigned to them; admins may do so for any lead.
// ===================================================================

/** Shared gate: the lead exists, the stage is open, and this person owns it. */
async function agreementAccess(agreementId: string): Promise<
  | { ok: true; profile: SessionProfile; leadId: string; agreementNumber: string }
  | { ok: false; message: string }
> {
  const profile = await requireProfile();
  const supabase = createAdminClient();

  const { data: agreement } = await supabase
    .from("agreements")
    .select("id, lead_id, agreement_number, status")
    .eq("id", agreementId)
    .maybeSingle();

  if (!agreement) return { ok: false, message: "That agreement no longer exists." };
  if (agreement.status === "COMPLETED") {
    return {
      ok: false,
      message: "This agreement is complete. Start a new version to change it.",
    };
  }

  const { data: lead } = await supabase
    .from("leads")
    .select("id, current_status, assigned_member_id")
    .eq("id", agreement.lead_id)
    .maybeSingle();

  if (!lead) return { ok: false, message: "That lead no longer exists." };
  if (!isAdmin(profile.role) && lead.assigned_member_id !== profile.id) {
    return { ok: false, message: "That lead is not assigned to you." };
  }
  if (!agreementStageIsAvailable(lead.current_status)) {
    return {
      ok: false,
      message:
        "Finish document review and approve the franchise before preparing its agreement.",
    };
  }

  return {
    ok: true,
    profile,
    leadId: agreement.lead_id,
    agreementNumber: agreement.agreement_number,
  };
}

/**
 * Create the agreement record for a lead that has none yet.
 *
 * Previously an agreement only existed once somebody uploaded a PDF. A
 * generated document needs a row to hold its field values from the start.
 */
export async function startAgreementDocument(
  leadId: string,
): Promise<ActionResult<{ agreementId: string }>> {
  const profile = await requireProfile();
  const supabase = createAdminClient();

  const { data: lead } = await supabase
    .from("leads")
    .select("id, current_status, assigned_member_id")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead) return { ok: false, message: "That lead no longer exists." };
  if (!isAdmin(profile.role) && lead.assigned_member_id !== profile.id) {
    return { ok: false, message: "That lead is not assigned to you." };
  }
  if (!agreementStageIsAvailable(lead.current_status)) {
    return {
      ok: false,
      message:
        "Finish document review and approve the franchise before preparing its agreement.",
    };
  }

  const { data: existing } = await supabase
    .from("agreements")
    .select("id, agreement_number, status, version")
    .eq("lead_id", leadId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  let agreementId: string;
  let agreementNumber: string;

  if (existing && existing.status !== "COMPLETED") {
    agreementId = existing.id;
    agreementNumber = existing.agreement_number;
  } else {
    const { data: created, error } = await supabase
      .from("agreements")
      .insert({
        lead_id: leadId,
        version: existing ? existing.version + 1 : 1,
        status: "PENDING",
        created_by: profile.id,
      })
      .select("id, agreement_number")
      .single();

    if (error || !created) {
      return {
        ok: false,
        message: error?.message ?? "Could not start the agreement.",
      };
    }

    agreementId = created.id;
    agreementNumber = created.agreement_number;

    await supabase.from("activity_logs").insert({
      actor_id: profile.id,
      entity_type: "agreement",
      entity_id: created.id,
      action: "AGREEMENT_DOCUMENT_STARTED",
      summary: `Started ${created.agreement_number} from the application.`,
    });
  }

  // Opening the document is the start of the agreement stage. Without this,
  // the generated route could send successfully while the lead stayed at
  // FRANCHISE_APPROVED and the rest of the pipeline never unlocked.
  if (canTransition(lead.current_status, "AGREEMENT_PENDING")) {
    const { error: leadError } = await supabase
      .from("leads")
      .update({ current_status: "AGREEMENT_PENDING" })
      .eq("id", leadId);
    if (leadError) return { ok: false, message: leadError.message };

    await supabase.from("lead_activities").insert({
      lead_id: leadId,
      member_id: profile.id,
      activity_type: "STATUS_CHANGE",
      previous_status: lead.current_status,
      new_status: "AGREEMENT_PENDING",
      notes: `Agreement ${agreementNumber} prepared from the application.`,
    });
  }

  refresh(leadId);
  return { ok: true, data: { agreementId } };
}

/** Save the fill-in values and any clause rewrites. */
export async function saveAgreementDocument(
  agreementId: string,
  values: Record<string, string>,
  overrides: Record<string, string>,
): Promise<ActionResult> {
  const access = await agreementAccess(agreementId);
  if (!access.ok) return access;

  const cleanValues = pickKnownFields(values);
  const cleanOverrides: Record<string, string> = {};
  for (const [id, html] of Object.entries(overrides)) {
    // Unknown ids would be dead weight; an empty override means "use standard".
    if (CLAUSE_BY_ID.has(id) && html.trim()) cleanOverrides[id] = html.trim();
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("agreements")
    .update({
      field_values: cleanValues,
      clause_overrides: cleanOverrides,
    })
    .eq("id", agreementId);

  if (error) return { ok: false, message: error.message };

  refresh(access.leadId);
  return { ok: true };
}

/**
 * Mint the customer's link, email it, and move the agreement to SENT.
 *
 * Any previous link for this agreement is revoked first: re-sending must not
 * leave an older URL working, or a superseded set of terms stays reachable.
 */
export async function sendAgreementDocument(
  agreementId: string,
): Promise<ActionResult<{ url: string; emailSent: boolean }>> {
  const access = await agreementAccess(agreementId);
  if (!access.ok) return access;

  const document = await loadAgreementDocument(agreementId);
  if (!document) return { ok: false, message: "That agreement no longer exists." };

  const missing = missingRequiredFields(document.values);
  if (missing.length > 0) {
    return {
      ok: false,
      message: `Fill in ${missing.length} more ${missing.length === 1 ? "field" : "fields"} first: ${missing
        .slice(0, 3)
        .map((field) => field.label)
        .join(", ")}${missing.length > 3 ? "…" : ""}`,
    };
  }

  const supabase = createAdminClient();

  const { data: lead } = await supabase
    .from("leads")
    .select("id, lead_number, full_name, email, current_status")
    .eq("id", access.leadId)
    .maybeSingle();

  if (!lead) return { ok: false, message: "That lead no longer exists." };

  const delivery = await deliverAgreementEmail({
    agreementId,
    agreementNumber: document.agreementNumber,
    leadId: access.leadId,
    leadNumber: lead.lead_number,
    toEmail: lead.email,
    toName: lead.full_name,
    actorId: access.profile.id,
  });
  if (!delivery.ok) return delivery;

  const { url, emailSent } = delivery;

  const { error: agreementError } = await supabase
    .from("agreements")
    .update({ status: "SENT", sent_at: new Date().toISOString() })
    .eq("id", agreementId);
  if (agreementError) return { ok: false, message: agreementError.message };

  // Usually startAgreementDocument already made the first transition. Keep
  // this action self-contained as well, so an older pending row cannot leave
  // the agreement and lead statuses disagreeing.
  let leadStatus = lead.current_status;
  if (canTransition(leadStatus, "AGREEMENT_PENDING")) {
    const { error } = await supabase
      .from("leads")
      .update({ current_status: "AGREEMENT_PENDING" })
      .eq("id", lead.id);
    if (!error) {
      await supabase.from("lead_activities").insert({
        lead_id: lead.id,
        member_id: access.profile.id,
        activity_type: "STATUS_CHANGE",
        previous_status: leadStatus,
        new_status: "AGREEMENT_PENDING",
        notes: `Agreement ${document.agreementNumber} prepared from the application.`,
      });
      leadStatus = "AGREEMENT_PENDING";
    }
  }
  if (canTransition(leadStatus, "AGREEMENT_SENT")) {
    const { error } = await supabase
      .from("leads")
      .update({ current_status: "AGREEMENT_SENT" })
      .eq("id", lead.id);
    if (!error) {
      await supabase.from("lead_activities").insert({
        lead_id: lead.id,
        member_id: access.profile.id,
        activity_type: "STATUS_CHANGE",
        previous_status: leadStatus,
        new_status: "AGREEMENT_SENT",
        notes: `Agreement ${document.agreementNumber} sent to the applicant.`,
      });
    }
  }

  await supabase.from("activity_logs").insert({
    actor_id: access.profile.id,
    entity_type: "agreement",
    entity_id: agreementId,
    action: "AGREEMENT_DOCUMENT_SENT",
    summary: `Sent ${document.agreementNumber} to ${lead.email}.`,
  });

  refresh(access.leadId);
  return { ok: true, data: { url, emailSent } };
}

/** Render the unsaved editor state, for the preview dialog. */
export async function previewAgreementDocument(
  agreementId: string,
  values: Record<string, string>,
  overrides: Record<string, string>,
): Promise<ActionResult<{ html: string; missing: string[] }>> {
  const access = await agreementAccess(agreementId);
  if (!access.ok) return access;

  const document = await loadAgreementDocument(agreementId);
  if (!document) return { ok: false, message: "That agreement no longer exists." };

  // Preview what is on screen, not what was last saved.
  const merged = { ...document.values, ...pickKnownFields(values) };

  return {
    ok: true,
    data: {
      html: renderFullDocument(merged, overrides, {
        agreementNumber: document.agreementNumber,
        version: document.version,
        documentVersion: AGREEMENT_DOCUMENT_VERSION,
        franchiseeName: merged.franchisee_name || document.franchiseeName,
      }),
      missing: missingRequiredFields(merged).map((field) => field.label),
    },
  };
}
