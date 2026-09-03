"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
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
    // The agreement travels with the email rather than behind a signed link:
    // applicants forward it to a spouse or a lawyer, and a link that expires
    // in ten minutes does not survive that. The brochure rides along so the
    // commercial terms are in the same thread as the paperwork.
    const agreementFile = agreement.storage_path
      ? await storedFileAttachment(
          STORAGE_BUCKETS.agreements,
          agreement.storage_path,
          agreement.file_name ?? `${agreement.agreement_number}.pdf`,
        )
      : null;

    await sendTemplateEmail({
      templateKey: "AGREEMENT_SENT",
      to: { email: lead.email, name: lead.full_name },
      vars: {
        applicant_name: lead.full_name,
        lead_number: lead.lead_number,
        agreement_number: agreement.agreement_number,
      },
      attachments: [agreementFile, BROCHURE_ATTACHMENT],
      leadId: lead.id,
      triggeredBy: profile.id,
    });
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
