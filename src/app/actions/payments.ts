"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireProfile } from "@/lib/auth/session";
import {
  PAYMENT_MODES,
  STORAGE_BUCKETS,
  type PaymentMode,
  type PaymentStatus,
} from "@/lib/domain/enums";
import { isAdmin } from "@/lib/domain/permissions";
import { canTransition } from "@/lib/domain/transitions";
import { sendTemplateEmail } from "@/lib/email/send";
import {
  createDirectUploadReceipt,
  readDirectUploadReceipt,
} from "@/lib/direct-upload-receipt";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ALLOWED_DOCUMENT_TYPES,
  MAX_UPLOAD_BYTES,
  paymentProofPath,
  removeFile,
  signedUrlFor,
} from "@/lib/storage";
import { formatCurrency } from "@/lib/utils";
import type { ActionResult } from "@/lib/validation/result";

const PAYMENT_ENTRY_STAGES = new Set([
  "AGREEMENT_COMPLETED",
  "PAYMENT_PENDING",
  "PAYMENT_PROOF_SUBMITTED",
  "PAYMENT_REJECTED",
]);
const PAYMENT_UPLOAD_PURPOSE = "PAYMENT_PROOF";
const UPLOAD_RECEIPT_TTL_MS = 15 * 60 * 1000;

export type PaymentProofMetadata = {
  fileName: string;
  fileSize: number;
  mimeType: string;
};

function paymentProofMetadataError(file: PaymentProofMetadata): string | null {
  if (!file.fileName.trim()) return "Choose a valid payment proof.";
  if (!Number.isSafeInteger(file.fileSize) || file.fileSize <= 0) {
    return "That file is empty.";
  }
  if (file.fileSize > MAX_UPLOAD_BYTES) {
    return `That file is ${(file.fileSize / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`;
  }
  if (!(ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(file.mimeType)) {
    return "Accepted formats are PDF, JPG, PNG and WebP.";
  }
  return null;
}

function refresh(leadId: string) {
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath(`/member/leads/${leadId}`);
  revalidatePath("/admin/payments");
  revalidatePath("/member/payments");
  revalidatePath("/admin/leads");
}

/** Members may only touch payments on leads assigned to them. */
async function guardLead(leadId: string) {
  const profile = await requireProfile();
  const supabase = createAdminClient();

  const { data: lead } = await supabase
    .from("leads")
    .select("id, lead_number, full_name, email, current_status, assigned_member_id")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead) return { ok: false as const, message: "That lead no longer exists." };
  if (!isAdmin(profile.role) && lead.assigned_member_id !== profile.id) {
    return { ok: false as const, message: "That lead is not assigned to you." };
  }
  return { ok: true as const, profile, lead };
}

async function guardPaymentEntry(leadId: string) {
  const guard = await guardLead(leadId);
  if (!guard.ok) return guard;

  if (!PAYMENT_ENTRY_STAGES.has(guard.lead.current_status)) {
    return {
      ok: false as const,
      message:
        "Payment opens only after document review, franchise approval, and agreement completion.",
    };
  }

  const { data: completedAgreement } = await createAdminClient()
    .from("agreements")
    .select("id")
    .eq("lead_id", leadId)
    .eq("status", "COMPLETED")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  return completedAgreement
    ? guard
    : ({
        ok: false as const,
        message: "Complete the agreement before recording payment.",
      } as const);
}

/** Returns a path-bound token; payment-proof bytes go browser → Supabase. */
export async function preparePaymentProofUpload(
  leadId: string,
  file: PaymentProofMetadata,
): Promise<
  ActionResult<{ path: string; uploadToken: string; receipt: string }>
> {
  const guard = await guardPaymentEntry(leadId);
  if (!guard.ok) return guard;

  const metadataError = paymentProofMetadataError(file);
  if (metadataError) {
    return {
      ok: false,
      message: metadataError,
      fieldErrors: { proof: metadataError },
    };
  }

  const fileName = file.fileName.trim().slice(0, 200);
  const path = paymentProofPath(leadId, fileName);
  const { data, error } = await createAdminClient().storage
    .from(STORAGE_BUCKETS.paymentProofs)
    .createSignedUploadUrl(path);
  if (error || !data?.token) {
    return { ok: false, message: "Could not prepare the secure proof upload." };
  }

  const receipt = createDirectUploadReceipt({
    purpose: PAYMENT_UPLOAD_PURPOSE,
    bucket: STORAGE_BUCKETS.paymentProofs,
    path,
    ownerId: leadId,
    actorId: guard.profile.id,
    fileName,
    fileSize: file.fileSize,
    mimeType: file.mimeType,
    expiresAt: Date.now() + UPLOAD_RECEIPT_TTL_MS,
  });
  return { ok: true, data: { path, uploadToken: data.token, receipt } };
}

export async function discardPaymentProofUpload(
  leadId: string,
  receipt: string,
): Promise<ActionResult> {
  const guard = await guardLead(leadId);
  if (!guard.ok) return guard;

  const upload = readDirectUploadReceipt(receipt, PAYMENT_UPLOAD_PURPOSE);
  if (
    !upload ||
    upload.ownerId !== leadId ||
    upload.actorId !== guard.profile.id ||
    upload.bucket !== STORAGE_BUCKETS.paymentProofs
  ) {
    return { ok: false, message: "That upload confirmation is invalid." };
  }

  const supabase = createAdminClient();
  const { data: registered } = await supabase
    .from("payments")
    .select("id")
    .eq("proof_storage_path", upload.path)
    .maybeSingle();
  if (!registered) await removeFile(STORAGE_BUCKETS.paymentProofs, upload.path);
  return { ok: true };
}

/**
 * Record a franchise investment payment and, optionally, its proof (spec §18).
 *
 * There is no payment gateway — money moves outside the system and this is the
 * record of it, which is why a proof file matters so much.
 */
export async function recordPayment(
  leadId: string,
  formData: FormData,
): Promise<ActionResult<{ status: string }>> {
  const guard = await guardPaymentEntry(leadId);
  if (!guard.ok) return guard;

  const amount = Number(formData.get("amount"));
  const mode = String(formData.get("paymentMode") ?? "");
  const reference = String(formData.get("referenceNumber") ?? "").trim();
  const paymentDate = String(formData.get("paymentDate") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const proofReceipt = String(formData.get("proofReceipt") ?? "");

  const fieldErrors: Record<string, string> = {};

  if (!Number.isFinite(amount) || amount <= 0) {
    fieldErrors.amount = "Enter the amount that was paid";
  }
  if (!(PAYMENT_MODES as readonly string[]).includes(mode)) {
    fieldErrors.paymentMode = "Choose how it was paid";
  }
  if (!paymentDate || Number.isNaN(new Date(paymentDate).getTime())) {
    fieldErrors.paymentDate = "Pick the date it was paid";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "Please check the highlighted fields.", fieldErrors };
  }

  const supabase = createAdminClient();
  const upload = proofReceipt
    ? readDirectUploadReceipt(proofReceipt, PAYMENT_UPLOAD_PURPOSE)
    : null;
  let proofPath: string | null = null;
  let proofName: string | null = null;
  if (proofReceipt) {
    const invalid =
      !upload ||
      upload.ownerId !== leadId ||
      upload.actorId !== guard.profile.id ||
      upload.bucket !== STORAGE_BUCKETS.paymentProofs ||
      upload.expiresAt < Date.now() ||
      paymentProofMetadataError({
        fileName: upload.fileName,
        fileSize: upload.fileSize,
        mimeType: upload.mimeType,
      }) !== null;
    if (invalid || !upload) {
      return {
        ok: false,
        message: "The secure proof upload expired. Please choose the file again.",
        fieldErrors: { proof: "Choose the payment proof again" },
      };
    }

    const { data: object, error: objectError } = await supabase.storage
      .from(STORAGE_BUCKETS.paymentProofs)
      .info(upload.path);
    if (
      objectError ||
      object?.size !== upload.fileSize ||
      object.contentType !== upload.mimeType
    ) {
      await removeFile(STORAGE_BUCKETS.paymentProofs, upload.path);
      return {
        ok: false,
        message: "The payment proof did not upload correctly. Please try again.",
        fieldErrors: { proof: "Upload the proof again" },
      };
    }

    proofPath = upload.path;
    proofName = upload.fileName;
  }

  const hasProof = Boolean(proofPath);

  // Proof present means the member is asserting it was paid; without it the
  // record is a placeholder still awaiting evidence.
  const status: PaymentStatus = hasProof ? "PROOF_SUBMITTED" : "PENDING";
  const now = new Date().toISOString();

  // Re-record replaces the open payment rather than stacking duplicates.
  const { data: existing } = await supabase
    .from("payments")
    .select("id, proof_storage_path, status")
    .eq("lead_id", leadId)
    .in("status", ["PENDING", "PROOF_SUBMITTED", "REJECTED"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const values = {
    amount,
    payment_mode: mode as PaymentMode,
    reference_number: reference || null,
    payment_date: paymentDate,
    notes: notes || null,
    status,
    submitted_by: guard.profile.id,
    submitted_at: hasProof ? now : null,
    rejection_reason: null,
    ...(proofPath
      ? { proof_storage_path: proofPath, proof_file_name: proofName }
      : {}),
  };

  const { error } = existing
    ? await supabase.from("payments").update(values).eq("id", existing.id)
    : await supabase.from("payments").insert({ lead_id: leadId, ...values });

  if (error) {
    if (proofPath) await removeFile(STORAGE_BUCKETS.paymentProofs, proofPath);
    return { ok: false, message: error.message };
  }

  // Replacing a proof leaves the old file orphaned; remove it now that the row
  // no longer points at it.
  if (proofPath && existing?.proof_storage_path) {
    await removeFile(STORAGE_BUCKETS.paymentProofs, existing.proof_storage_path);
  }

  const target = hasProof ? "PAYMENT_PROOF_SUBMITTED" : "PAYMENT_PENDING";
  if (canTransition(guard.lead.current_status, target)) {
    await supabase
      .from("leads")
      .update({ current_status: target })
      .eq("id", leadId);

    await supabase.from("lead_activities").insert({
      lead_id: leadId,
      member_id: guard.profile.id,
      activity_type: "STATUS_CHANGE",
      previous_status: guard.lead.current_status,
      new_status: target,
      notes: hasProof
        ? `Payment proof submitted for ${formatCurrency(amount)}.`
        : `Payment of ${formatCurrency(amount)} recorded, awaiting proof.`,
    });
  }

  refresh(leadId);
  return { ok: true, data: { status } };
}

export async function approvePayment(
  paymentId: string,
  sendEmail: boolean,
): Promise<ActionResult> {
  const profile = await requireAdmin();
  const supabase = createAdminClient();

  const { data: payment } = await supabase
    .from("payments")
    .select("id, lead_id, amount, status")
    .eq("id", paymentId)
    .maybeSingle();

  if (!payment) return { ok: false, message: "That payment no longer exists." };
  if (payment.status === "APPROVED") {
    return { ok: false, message: "That payment is already approved." };
  }
  if (payment.status !== "PROOF_SUBMITTED") {
    return { ok: false, message: "There is no payment proof to approve yet." };
  }

  const { data: lead } = await supabase
    .from("leads")
    .select("id, lead_number, full_name, email, current_status")
    .eq("id", payment.lead_id)
    .maybeSingle();

  if (!lead) return { ok: false, message: "That lead no longer exists." };
  if (!canTransition(lead.current_status, "PAYMENT_APPROVED")) {
    return {
      ok: false,
      message: "This lead is not waiting for payment approval.",
    };
  }

  await supabase
    .from("payments")
    .update({
      status: "APPROVED",
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .eq("id", paymentId);

  // Approval carries straight through to READY_FOR_ACTIVATION so the
  // activation queue is accurate without a second manual step.
  let target = lead.current_status;
  if (canTransition(lead.current_status, "PAYMENT_APPROVED")) {
    target = "PAYMENT_APPROVED";
    await supabase.from("leads").update({ current_status: target }).eq("id", lead.id);
    await supabase.from("lead_activities").insert({
      lead_id: lead.id,
      member_id: profile.id,
      activity_type: "STATUS_CHANGE",
      previous_status: lead.current_status,
      new_status: target,
      notes: `Payment of ${formatCurrency(Number(payment.amount))} approved.`,
    });

    await supabase
      .from("leads")
      .update({ current_status: "READY_FOR_ACTIVATION" })
      .eq("id", lead.id);
    await supabase.from("lead_activities").insert({
      lead_id: lead.id,
      member_id: profile.id,
      activity_type: "STATUS_CHANGE",
      previous_status: "PAYMENT_APPROVED",
      new_status: "READY_FOR_ACTIVATION",
      notes: "Ready for franchise activation.",
    });
  }

  if (sendEmail) {
    await sendTemplateEmail({
      templateKey: "PAYMENT_APPROVED",
      to: { email: lead.email, name: lead.full_name },
      vars: {
        applicant_name: lead.full_name,
        lead_number: lead.lead_number,
        payment_amount: formatCurrency(Number(payment.amount)),
      },
      leadId: lead.id,
      triggeredBy: profile.id,
    });
  }

  await supabase.from("activity_logs").insert({
    actor_id: profile.id,
    entity_type: "payment",
    entity_id: paymentId,
    action: "PAYMENT_APPROVED",
    summary: `Approved ${formatCurrency(Number(payment.amount))} for ${lead.lead_number}.`,
  });

  refresh(lead.id);
  return { ok: true };
}

export async function rejectPayment(
  paymentId: string,
  reason: string,
  sendEmail: boolean,
): Promise<ActionResult> {
  const profile = await requireAdmin();

  const trimmed = reason.trim();
  if (trimmed.length < 5) {
    return {
      ok: false,
      message: "A reason is required — the member has to know what to fix.",
      fieldErrors: { reason: "Explain what is wrong with the proof" },
    };
  }

  const supabase = createAdminClient();

  const { data: payment } = await supabase
    .from("payments")
    .select("id, lead_id, amount, status")
    .eq("id", paymentId)
    .maybeSingle();

  if (!payment) return { ok: false, message: "That payment no longer exists." };
  if (payment.status === "APPROVED") {
    return { ok: false, message: "That payment has already been approved." };
  }

  const { data: lead } = await supabase
    .from("leads")
    .select("id, lead_number, full_name, email, current_status")
    .eq("id", payment.lead_id)
    .maybeSingle();

  if (!lead) return { ok: false, message: "That lead no longer exists." };
  if (!canTransition(lead.current_status, "PAYMENT_REJECTED")) {
    return {
      ok: false,
      message: "This lead is not waiting for payment-proof review.",
    };
  }

  await supabase
    .from("payments")
    .update({
      status: "REJECTED",
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: trimmed,
    })
    .eq("id", paymentId);

  if (canTransition(lead.current_status, "PAYMENT_REJECTED")) {
    await supabase
      .from("leads")
      .update({ current_status: "PAYMENT_REJECTED" })
      .eq("id", lead.id);

    await supabase.from("lead_activities").insert({
      lead_id: lead.id,
      member_id: profile.id,
      activity_type: "STATUS_CHANGE",
      previous_status: lead.current_status,
      new_status: "PAYMENT_REJECTED",
      notes: trimmed,
    });
  }

  if (sendEmail) {
    await sendTemplateEmail({
      templateKey: "PAYMENT_REJECTED",
      to: { email: lead.email, name: lead.full_name },
      vars: {
        applicant_name: lead.full_name,
        lead_number: lead.lead_number,
        payment_amount: formatCurrency(Number(payment.amount)),
        reupload_reason: trimmed,
      },
      leadId: lead.id,
      triggeredBy: profile.id,
    });
  }

  await supabase.from("activity_logs").insert({
    actor_id: profile.id,
    entity_type: "payment",
    entity_id: paymentId,
    action: "PAYMENT_REJECTED",
    summary: `Rejected payment for ${lead.lead_number}: ${trimmed}`,
  });

  refresh(lead.id);
  return { ok: true };
}

export async function getPaymentProofUrl(
  paymentId: string,
  download = false,
): Promise<ActionResult<{ url: string }>> {
  const profile = await requireProfile();
  const supabase = createAdminClient();

  const { data: payment } = await supabase
    .from("payments")
    .select("id, lead_id, proof_storage_path, proof_file_name")
    .eq("id", paymentId)
    .maybeSingle();

  if (!payment?.proof_storage_path) {
    return { ok: false, message: "There is no proof file on this payment." };
  }

  if (!isAdmin(profile.role)) {
    const { data: lead } = await supabase
      .from("leads")
      .select("assigned_member_id")
      .eq("id", payment.lead_id)
      .maybeSingle();
    if (!lead || lead.assigned_member_id !== profile.id) {
      return { ok: false, message: "That payment is not yours to view." };
    }
  }

  const url = await signedUrlFor(
    STORAGE_BUCKETS.paymentProofs,
    payment.proof_storage_path,
    { download: download ? (payment.proof_file_name ?? "payment-proof") : undefined },
  );

  return url
    ? { ok: true, data: { url } }
    : { ok: false, message: "Could not open that file." };
}
