"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireProfile } from "@/lib/auth/session";
import { resolveToken } from "@/lib/data/tokens";
import { canApplicantUpload, overallDocumentStatus } from "@/lib/domain/documents";
import {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  STORAGE_BUCKETS,
  type DocumentStatus,
  type DocumentType,
  type LeadStatus,
} from "@/lib/domain/enums";
import { isAdmin } from "@/lib/domain/permissions";
import { canTransition } from "@/lib/domain/transitions";
import { sendTemplateEmail } from "@/lib/email/send";
import { appUrl } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  checkUpload,
  documentPath,
  removeFile,
  uploadFile,
} from "@/lib/storage";
import { createToken, documentsUrl, hashToken } from "@/lib/tokens";
import type { ActionResult } from "@/lib/validation/result";

const LINK_TTL_DAYS = 30;

function refresh(leadId: string) {
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath(`/member/leads/${leadId}`);
  revalidatePath("/admin/documents");
  revalidatePath("/member/documents");
  revalidatePath("/admin/leads");
}

/**
 * Recomputes the lead's document status from its request rows and moves the
 * lead if the pipeline allows it. Called after every upload and review, so the
 * roll-up is never stale (spec §14).
 */
async function syncDocumentStatus(applicationId: string, leadId: string) {
  const supabase = createAdminClient();

  const { data: requests } = await supabase
    .from("document_requests")
    .select("status")
    .eq("application_id", applicationId);

  const target = overallDocumentStatus(
    (requests ?? []).map((request) => request.status as DocumentStatus),
  );

  const { data: lead } = await supabase
    .from("leads")
    .select("current_status")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead) return target;

  const from = lead.current_status as LeadStatus;
  if (from !== target && canTransition(from, target)) {
    await supabase
      .from("leads")
      .update({ current_status: target })
      .eq("id", leadId);

    await supabase.from("lead_activities").insert({
      lead_id: leadId,
      member_id: null,
      activity_type: "STATUS_CHANGE",
      previous_status: from,
      new_status: target,
      notes: "Document status recalculated.",
    });
  }

  return target;
}

/** Issues a fresh DOCUMENTS link, revoking any earlier one. */
async function issueDocumentToken(
  leadId: string,
  applicationId: string,
  createdBy: string,
): Promise<string> {
  const supabase = createAdminClient();

  await supabase
    .from("application_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("lead_id", leadId)
    .eq("purpose", "DOCUMENTS")
    .is("revoked_at", null);

  const token = createToken("DOCUMENTS");
  await supabase.from("application_tokens").insert({
    lead_id: leadId,
    application_id: applicationId,
    token_hash: hashToken(token),
    purpose: "DOCUMENTS",
    expires_at: new Date(
      Date.now() + LINK_TTL_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString(),
    created_by: createdBy,
  });

  return documentsUrl(appUrl, token);
}

// -------------------------------------------------------------------
// Request documents (spec §14)
// -------------------------------------------------------------------

export async function requestDocuments(
  leadId: string,
  documentTypes: string[],
  note: string,
  sendEmail: boolean,
): Promise<ActionResult<{ url: string; emailSent: boolean }>> {
  const profile = await requireProfile();
  const supabase = createAdminClient();

  const selected = documentTypes.filter((type): type is DocumentType =>
    (DOCUMENT_TYPES as readonly string[]).includes(type),
  );

  if (selected.length === 0) {
    return { ok: false, message: "Select at least one document to request." };
  }

  const { data: lead } = await supabase
    .from("leads")
    .select("id, lead_number, full_name, email, current_status, assigned_member_id")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead) return { ok: false, message: "That lead no longer exists." };
  if (!isAdmin(profile.role) && lead.assigned_member_id !== profile.id) {
    return { ok: false, message: "That lead is not assigned to you." };
  }

  const { data: application } = await supabase
    .from("applications")
    .select("id, status")
    .eq("lead_id", leadId)
    .maybeSingle();

  if (!application) {
    return {
      ok: false,
      message: "Send the application link first — documents hang off the application.",
    };
  }

  // Upsert: re-requesting an existing type must not wipe an approved document.
  const { data: existing } = await supabase
    .from("document_requests")
    .select("id, document_type, status")
    .eq("application_id", application.id);

  const known = new Map(
    (existing ?? []).map((row) => [row.document_type, row] as const),
  );

  const toInsert = selected
    .filter((type) => !known.has(type))
    .map((type) => ({
      application_id: application.id,
      document_type: type,
      request_note: note.trim() || null,
      requested_by: profile.id,
    }));

  if (toInsert.length > 0) {
    const { error } = await supabase.from("document_requests").insert(toInsert);
    if (error) return { ok: false, message: error.message };
  }

  const url = await issueDocumentToken(leadId, application.id, profile.id);

  let emailSent = false;
  if (sendEmail) {
    const result = await sendTemplateEmail({
      templateKey: "DOCUMENT_REQUEST",
      to: { email: lead.email, name: lead.full_name },
      vars: {
        applicant_name: lead.full_name,
        lead_number: lead.lead_number,
        document_names: selected
          .map((type) => DOCUMENT_TYPE_LABELS[type])
          .join(", "),
        application_link: url,
      },
      leadId,
      triggeredBy: profile.id,
    });
    emailSent = result.status === "SENT";
  }

  await syncDocumentStatus(application.id, leadId);

  await supabase.from("activity_logs").insert({
    actor_id: profile.id,
    entity_type: "application",
    entity_id: application.id,
    action: "DOCUMENTS_REQUESTED",
    summary: `Requested ${selected.length} document(s) for ${lead.lead_number}.`,
  });

  refresh(leadId);
  return { ok: true, data: { url, emailSent } };
}

export async function cancelDocumentRequest(
  requestId: string,
): Promise<ActionResult> {
  const profile = await requireAdmin();
  const supabase = createAdminClient();

  const { data: request } = await supabase
    .from("document_requests")
    .select("id, application_id, status, document_type")
    .eq("id", requestId)
    .maybeSingle();

  if (!request) return { ok: false, message: "That request no longer exists." };
  if (request.status === "APPROVED") {
    return { ok: false, message: "An approved document cannot be un-requested." };
  }

  const { data: application } = await supabase
    .from("applications")
    .select("lead_id")
    .eq("id", request.application_id)
    .maybeSingle();

  // Cascades to documents; the stored files are left for the storage lifecycle
  // rule rather than deleted inline, so a mis-click is recoverable.
  const { error } = await supabase
    .from("document_requests")
    .delete()
    .eq("id", requestId);

  if (error) return { ok: false, message: error.message };

  if (application) {
    await syncDocumentStatus(request.application_id, application.lead_id);
    await supabase.from("activity_logs").insert({
      actor_id: profile.id,
      entity_type: "application",
      entity_id: request.application_id,
      action: "DOCUMENT_REQUEST_CANCELLED",
      summary: `Cancelled the request for ${DOCUMENT_TYPE_LABELS[request.document_type]}.`,
    });
    refresh(application.lead_id);
  }

  return { ok: true };
}

// -------------------------------------------------------------------
// Applicant upload — authenticated by token only
// -------------------------------------------------------------------

export async function uploadDocument(
  token: string,
  formData: FormData,
): Promise<ActionResult<{ documentType: string }>> {
  const resolved = await resolveToken(token, "DOCUMENTS");
  if (!resolved.ok) return { ok: false, message: "This link is no longer valid." };

  const requestId = String(formData.get("requestId") ?? "");
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return { ok: false, message: "Choose a file to upload." };
  }

  const check = checkUpload(file);
  if (!check.ok) return { ok: false, message: check.message };

  const supabase = createAdminClient();

  const { data: request } = await supabase
    .from("document_requests")
    .select("id, application_id, document_type, status")
    .eq("id", requestId)
    .maybeSingle();

  if (!request) return { ok: false, message: "That document was not requested." };

  // The token identifies a lead; confirm the request belongs to *that* lead's
  // application, or one applicant's token could write to another's documents.
  if (request.application_id !== resolved.data.applicationId) {
    return { ok: false, message: "That document was not requested." };
  }

  // Approved documents are locked (spec §15).
  if (!canApplicantUpload(request.status as DocumentStatus)) {
    return {
      ok: false,
      message:
        request.status === "APPROVED"
          ? "That document is already approved and cannot be replaced."
          : "That document has already been received and is being reviewed.",
    };
  }

  const { data: latest } = await supabase
    .from("documents")
    .select("version")
    .eq("document_request_id", request.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const version = (latest?.version ?? 0) + 1;
  const path = documentPath(
    request.application_id,
    request.document_type,
    version,
    file.name,
  );

  const uploaded = await uploadFile(STORAGE_BUCKETS.documents, path, file);
  if (!uploaded.ok) return { ok: false, message: uploaded.message };

  const { error } = await supabase.from("documents").insert({
    document_request_id: request.id,
    application_id: request.application_id,
    document_type: request.document_type,
    storage_path: path,
    file_name: file.name.slice(0, 200),
    file_size: file.size,
    mime_type: file.type,
    version,
    status: "UPLOADED",
  });

  if (error) {
    // Do not leave an orphan file behind if the row failed to write.
    await removeFile(STORAGE_BUCKETS.documents, path);
    return { ok: false, message: error.message };
  }

  await supabase
    .from("document_requests")
    .update({ status: "UPLOADED" })
    .eq("id", request.id);

  await syncDocumentStatus(request.application_id, resolved.data.leadId);
  refresh(resolved.data.leadId);

  return {
    ok: true,
    data: { documentType: DOCUMENT_TYPE_LABELS[request.document_type] },
  };
}

// -------------------------------------------------------------------
// Per-document review (spec §15)
// -------------------------------------------------------------------

export async function approveDocument(
  documentId: string,
  sendEmail: boolean,
  note?: string,
): Promise<ActionResult> {
  const profile = await requireAdmin();
  const supabase = createAdminClient();

  const { data: document } = await supabase
    .from("documents")
    .select("id, document_request_id, application_id, document_type, status")
    .eq("id", documentId)
    .maybeSingle();

  if (!document) return { ok: false, message: "That document no longer exists." };
  if (document.status === "APPROVED") {
    return { ok: false, message: "That document is already approved." };
  }

  const now = new Date().toISOString();

  await supabase
    .from("documents")
    .update({
      status: "APPROVED",
      reviewed_by: profile.id,
      reviewed_at: now,
      rejection_reason: null,
    })
    .eq("id", documentId);

  await supabase
    .from("document_requests")
    .update({ status: "APPROVED" })
    .eq("id", document.document_request_id);

  await supabase.from("document_reviews").insert({
    document_id: documentId,
    reviewer_id: profile.id,
    decision: "APPROVED",
    note: note?.trim() || null,
  });

  const { data: application } = await supabase
    .from("applications")
    .select("lead_id")
    .eq("id", document.application_id)
    .maybeSingle();

  if (!application) return { ok: true };

  const overall = await syncDocumentStatus(
    document.application_id,
    application.lead_id,
  );

  if (sendEmail) {
    const { data: lead } = await supabase
      .from("leads")
      .select("lead_number, full_name, email")
      .eq("id", application.lead_id)
      .maybeSingle();

    if (lead) {
      await sendTemplateEmail({
        templateKey: "APPLICATION_APPROVED",
        to: { email: lead.email, name: lead.full_name },
        vars: {
          applicant_name: lead.full_name,
          lead_number: lead.lead_number,
          document_names: DOCUMENT_TYPE_LABELS[document.document_type],
        },
        leadId: application.lead_id,
        triggeredBy: profile.id,
      });
    }
  }

  await supabase.from("activity_logs").insert({
    actor_id: profile.id,
    entity_type: "document",
    entity_id: documentId,
    action: "DOCUMENT_APPROVED",
    summary: `Approved ${DOCUMENT_TYPE_LABELS[document.document_type]} — set to ${overall}.`,
  });

  refresh(application.lead_id);
  return { ok: true };
}

export async function requestDocumentReupload(
  documentId: string,
  reason: string,
  sendEmail: boolean,
): Promise<ActionResult<{ url: string }>> {
  const profile = await requireAdmin();

  const trimmed = reason.trim();
  if (trimmed.length < 5) {
    return {
      ok: false,
      message: "A reason is required so the applicant knows what to fix.",
      fieldErrors: { reason: "Explain what needs correcting" },
    };
  }

  const supabase = createAdminClient();

  const { data: document } = await supabase
    .from("documents")
    .select("id, document_request_id, application_id, document_type, status")
    .eq("id", documentId)
    .maybeSingle();

  if (!document) return { ok: false, message: "That document no longer exists." };

  const now = new Date().toISOString();

  await supabase
    .from("documents")
    .update({
      status: "REUPLOAD_REQUIRED",
      reviewed_by: profile.id,
      reviewed_at: now,
      rejection_reason: trimmed,
    })
    .eq("id", documentId);

  await supabase
    .from("document_requests")
    .update({ status: "REUPLOAD_REQUIRED" })
    .eq("id", document.document_request_id);

  await supabase.from("document_reviews").insert({
    document_id: documentId,
    reviewer_id: profile.id,
    decision: "REUPLOAD_REQUIRED",
    note: trimmed,
  });

  const { data: application } = await supabase
    .from("applications")
    .select("lead_id")
    .eq("id", document.application_id)
    .maybeSingle();

  if (!application) return { ok: false, message: "That application no longer exists." };

  await syncDocumentStatus(document.application_id, application.lead_id);

  const url = await issueDocumentToken(
    application.lead_id,
    document.application_id,
    profile.id,
  );

  if (sendEmail) {
    const { data: lead } = await supabase
      .from("leads")
      .select("lead_number, full_name, email")
      .eq("id", application.lead_id)
      .maybeSingle();

    if (lead) {
      await sendTemplateEmail({
        templateKey: "DOCUMENT_REUPLOAD_REQUEST",
        to: { email: lead.email, name: lead.full_name },
        vars: {
          applicant_name: lead.full_name,
          lead_number: lead.lead_number,
          document_names: DOCUMENT_TYPE_LABELS[document.document_type],
          reupload_reason: trimmed,
          application_link: url,
        },
        leadId: application.lead_id,
        triggeredBy: profile.id,
      });
    }
  }

  await supabase.from("activity_logs").insert({
    actor_id: profile.id,
    entity_type: "document",
    entity_id: documentId,
    action: "DOCUMENT_REUPLOAD_REQUESTED",
    summary: `Re-upload requested for ${DOCUMENT_TYPE_LABELS[document.document_type]}: ${trimmed}`,
  });

  refresh(application.lead_id);
  return { ok: true, data: { url } };
}

export async function addDocumentReviewNote(
  documentId: string,
  note: string,
): Promise<ActionResult> {
  const profile = await requireAdmin();

  const trimmed = note.trim();
  if (!trimmed) return { ok: false, message: "Write a note first." };

  const supabase = createAdminClient();

  const { data: document } = await supabase
    .from("documents")
    .select("id, status, application_id")
    .eq("id", documentId)
    .maybeSingle();

  if (!document) return { ok: false, message: "That document no longer exists." };

  // A note is a comment, not a decision — the status is recorded as-is.
  await supabase.from("document_reviews").insert({
    document_id: documentId,
    reviewer_id: profile.id,
    decision: document.status,
    note: trimmed,
  });

  const { data: application } = await supabase
    .from("applications")
    .select("lead_id")
    .eq("id", document.application_id)
    .maybeSingle();

  if (application) refresh(application.lead_id);
  return { ok: true };
}

/** Fresh signed URL for viewing or downloading a stored document. */
export async function getDocumentUrl(
  documentId: string,
  download = false,
): Promise<ActionResult<{ url: string }>> {
  const profile = await requireProfile();
  const supabase = createAdminClient();

  const { data: document } = await supabase
    .from("documents")
    .select("id, storage_path, file_name, application_id")
    .eq("id", documentId)
    .maybeSingle();

  if (!document) return { ok: false, message: "That document no longer exists." };

  if (!isAdmin(profile.role)) {
    const { data: application } = await supabase
      .from("applications")
      .select("lead_id")
      .eq("id", document.application_id)
      .maybeSingle();

    const { data: lead } = application
      ? await supabase
          .from("leads")
          .select("assigned_member_id")
          .eq("id", application.lead_id)
          .maybeSingle()
      : { data: null };

    if (!lead || lead.assigned_member_id !== profile.id) {
      return { ok: false, message: "That document is not yours to view." };
    }
  }

  const { signedUrlFor } = await import("@/lib/storage");
  const url = await signedUrlFor(STORAGE_BUCKETS.documents, document.storage_path, {
    download: download ? document.file_name : undefined,
  });

  return url
    ? { ok: true, data: { url } }
    : { ok: false, message: "Could not open that file." };
}
