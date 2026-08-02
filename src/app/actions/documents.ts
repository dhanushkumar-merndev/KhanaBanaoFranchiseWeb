"use server";

import { createHmac, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireProfile } from "@/lib/auth/session";
import { resolveToken } from "@/lib/data/tokens";
import { hasDocumentAccess } from "@/lib/document-otp";
import {
  canApplyDocumentRollup,
  overallDocumentStatus,
} from "@/lib/domain/documents";
import {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  LEAD_STATUSES,
  STORAGE_BUCKETS,
  type DocumentStatus,
  type DocumentType,
  type LeadStatus,
} from "@/lib/domain/enums";
import { isAdmin } from "@/lib/domain/permissions";
import { sendTemplateEmail } from "@/lib/email/send";
import { appUrl, documentTokenSecret } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ALLOWED_DOCUMENT_TYPES,
  MAX_UPLOAD_BYTES,
  documentPath,
  removeFile,
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
  // These statuses are a roll-up of the request rows, not a manually chosen
  // pipeline jump. For example, approving the final outstanding document can
  // legitimately recalculate PARTIALLY_SUBMITTED straight to APPROVED. The
  // ordinary transition map rejects that skipped display state, which left the
  // lead stale even though every underlying request was approved.
  if (from !== target && canApplyDocumentRollup(from, target)) {
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
    .select(
      "id, lead_number, full_name, email, current_status, assigned_member_id",
    )
    .eq("id", leadId)
    .maybeSingle();

  if (!lead) return { ok: false, message: "That lead no longer exists." };
  if (!isAdmin(profile.role) && lead.assigned_member_id !== profile.id) {
    return { ok: false, message: "That lead is not assigned to you." };
  }
  if (
    LEAD_STATUSES.indexOf(lead.current_status) >=
    LEAD_STATUSES.indexOf("FRANCHISE_APPROVED")
  ) {
    return {
      ok: false,
      message:
        "Documents cannot be added after the franchise has been approved.",
    };
  }

  const { data: application } = await supabase
    .from("applications")
    .select("id, status")
    .eq("lead_id", leadId)
    .maybeSingle();

  if (!application) {
    return {
      ok: false,
      message:
        "Send the application link first — documents hang off the application.",
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
    return {
      ok: false,
      message: "An approved document cannot be un-requested.",
    };
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

/**
 * Permanently removes every uploaded version for one requested document while
 * keeping the request open. A fresh secure upload link is returned so the
 * applicant can supply a replacement.
 */
export async function deleteDocument(
  documentId: string,
): Promise<ActionResult<{ url: string }>> {
  const profile = await requireAdmin();
  const supabase = createAdminClient();

  const { data: document } = await supabase
    .from("documents")
    .select("id, document_request_id, application_id, document_type, file_name")
    .eq("id", documentId)
    .maybeSingle();

  if (!document) {
    return { ok: false, message: "That document no longer exists." };
  }

  const [{ data: application }, { data: versions }] = await Promise.all([
    supabase
      .from("applications")
      .select("lead_id")
      .eq("id", document.application_id)
      .maybeSingle(),
    supabase
      .from("documents")
      .select("id, storage_path")
      .eq("document_request_id", document.document_request_id),
  ]);

  if (!application) {
    return { ok: false, message: "That application no longer exists." };
  }

  const { data: lead } = await supabase
    .from("leads")
    .select("lead_number, current_status")
    .eq("id", application.lead_id)
    .maybeSingle();

  if (!lead) return { ok: false, message: "That lead no longer exists." };
  if (
    LEAD_STATUSES.indexOf(lead.current_status) >=
    LEAD_STATUSES.indexOf("FRANCHISE_APPROVED")
  ) {
    return {
      ok: false,
      message:
        "Documents cannot be deleted after franchise approval. Revoke the later workflow first.",
    };
  }

  const { error: deleteError } = await supabase
    .from("documents")
    .delete()
    .eq("document_request_id", document.document_request_id);

  if (deleteError) return { ok: false, message: deleteError.message };

  const { error: requestError } = await supabase
    .from("document_requests")
    .update({ status: "REQUESTED" })
    .eq("id", document.document_request_id);

  if (requestError) return { ok: false, message: requestError.message };

  await Promise.all(
    (versions ?? []).map((version) =>
      removeFile(STORAGE_BUCKETS.documents, version.storage_path),
    ),
  );

  await syncDocumentStatus(document.application_id, application.lead_id);
  const url = await issueDocumentToken(
    application.lead_id,
    document.application_id,
    profile.id,
  );

  await supabase.from("activity_logs").insert({
    actor_id: profile.id,
    entity_type: "document",
    entity_id: document.id,
    action: "DOCUMENT_DELETED",
    summary: `Deleted all uploaded versions of ${DOCUMENT_TYPE_LABELS[document.document_type]} for ${lead.lead_number}.`,
  });

  refresh(application.lead_id);
  return { ok: true, data: { url } };
}

// -------------------------------------------------------------------
// Applicant upload — authenticated by token only
// -------------------------------------------------------------------

const UPLOAD_RECEIPT_TTL_MS = 15 * 60 * 1000;
const UPLOAD_RECEIPT_CONTEXT = "DOCUMENT_UPLOAD_V1";

export type DocumentUploadMetadata = {
  requestId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
};

export type PreparedDocumentUpload = {
  requestId: string;
  path: string;
  uploadToken: string;
  receipt: string;
};

type UploadReceiptPayload = DocumentUploadMetadata & {
  applicationId: string;
  documentType: DocumentType;
  path: string;
  version: number;
  tokenId: string;
  expiresAt: number;
};

function validateUploadMetadata(file: DocumentUploadMetadata): string | null {
  if (!file.requestId || !file.fileName.trim()) return "Choose a valid file.";
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

function uploadReceiptSignature(encodedPayload: string): string {
  return createHmac("sha256", documentTokenSecret())
    .update(`${UPLOAD_RECEIPT_CONTEXT}:${encodedPayload}`)
    .digest("base64url");
}

function createUploadReceipt(payload: UploadReceiptPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${uploadReceiptSignature(encoded)}`;
}

function readUploadReceipt(receipt: string): UploadReceiptPayload | null {
  const separator = receipt.lastIndexOf(".");
  if (separator <= 0) return null;

  const encoded = receipt.slice(0, separator);
  const signature = receipt.slice(separator + 1);
  const expected = uploadReceiptSignature(encoded);
  const suppliedBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (
    suppliedBytes.length !== expectedBytes.length ||
    !timingSafeEqual(suppliedBytes, expectedBytes)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as Partial<UploadReceiptPayload>;
    if (
      typeof payload.requestId !== "string" ||
      typeof payload.applicationId !== "string" ||
      typeof payload.path !== "string" ||
      typeof payload.fileName !== "string" ||
      typeof payload.fileSize !== "number" ||
      typeof payload.mimeType !== "string" ||
      typeof payload.version !== "number" ||
      typeof payload.tokenId !== "string" ||
      typeof payload.expiresAt !== "number" ||
      !(DOCUMENT_TYPES as readonly string[]).includes(
        payload.documentType ?? "",
      )
    ) {
      return null;
    }
    return payload as UploadReceiptPayload;
  } catch {
    return null;
  }
}

async function removePreparedObjects(payloads: UploadReceiptPayload[]) {
  await Promise.all(
    payloads.map((payload) =>
      removeFile(STORAGE_BUCKETS.documents, payload.path),
    ),
  );
}

async function removeUnregisteredPreparedObjects(
  payloads: UploadReceiptPayload[],
) {
  if (payloads.length === 0) return;

  const supabase = createAdminClient();
  const { data: registered } = await supabase
    .from("documents")
    .select("storage_path")
    .in(
      "storage_path",
      payloads.map((payload) => payload.path),
    );
  const registeredPaths = new Set(
    (registered ?? []).map((document) => document.storage_path),
  );
  await removePreparedObjects(
    payloads.filter((payload) => !registeredPaths.has(payload.path)),
  );
}

/**
 * Validates the applicant and returns path-bound Supabase upload tokens.
 * Only small metadata crosses the Next.js server; file bytes do not.
 */
export async function prepareDocumentUploads(
  token: string,
  files: DocumentUploadMetadata[],
): Promise<ActionResult<{ uploads: PreparedDocumentUpload[] }>> {
  const resolved = await resolveToken(token, "DOCUMENTS");
  if (!resolved.ok)
    return { ok: false, message: "This link is no longer valid." };
  if (!(await hasDocumentAccess(resolved.data.tokenId))) {
    return {
      ok: false,
      message: "Verify your email before uploading documents.",
    };
  }
  if (!resolved.data.applicationId) {
    return { ok: false, message: "That application no longer exists." };
  }
  if (!Array.isArray(files)) {
    return { ok: false, message: "Choose a file for every document first." };
  }

  const supabase = createAdminClient();
  const { data: requests } = await supabase
    .from("document_requests")
    .select("id, application_id, document_type, status")
    .eq("application_id", resolved.data.applicationId)
    .in("status", ["REQUESTED", "REUPLOAD_REQUIRED"])
    .order("requested_at");

  const outstanding = requests ?? [];
  if (outstanding.length === 0) {
    return {
      ok: false,
      message: "All requested documents have already been submitted.",
    };
  }

  const submittedIds = files.map((file) => file.requestId);
  const expectedIds = new Set(outstanding.map((request) => request.id));
  if (
    submittedIds.length !== outstanding.length ||
    new Set(submittedIds).size !== submittedIds.length ||
    submittedIds.some((id) => !expectedIds.has(id))
  ) {
    return { ok: false, message: "Choose a file for every document first." };
  }

  const metadataByRequest = new Map(
    files.map((file) => [file.requestId, file]),
  );
  for (const request of outstanding) {
    const file = metadataByRequest.get(request.id)!;
    const error = validateUploadMetadata(file);
    if (error) {
      return {
        ok: false,
        message: `${DOCUMENT_TYPE_LABELS[request.document_type]}: ${error}`,
      };
    }
  }

  const requestIds = outstanding.map((request) => request.id);
  const { data: previous } = await supabase
    .from("documents")
    .select("document_request_id, version")
    .in("document_request_id", requestIds)
    .order("version", { ascending: false });

  const latestVersion = new Map<string, number>();
  for (const document of previous ?? []) {
    if (!latestVersion.has(document.document_request_id)) {
      latestVersion.set(document.document_request_id, document.version);
    }
  }

  const expiresAt = Date.now() + UPLOAD_RECEIPT_TTL_MS;
  const uploads: PreparedDocumentUpload[] = [];
  for (const request of outstanding) {
    const file = metadataByRequest.get(request.id)!;
    const fileName = file.fileName.trim().slice(0, 200);
    const version = (latestVersion.get(request.id) ?? 0) + 1;
    const path = documentPath(
      request.application_id,
      request.document_type,
      version,
      fileName,
    );
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS.documents)
      .createSignedUploadUrl(path);

    if (error || !data?.token) {
      return {
        ok: false,
        message: "Could not prepare the secure upload. Please try again.",
      };
    }

    const payload: UploadReceiptPayload = {
      requestId: request.id,
      applicationId: request.application_id,
      documentType: request.document_type,
      path,
      version,
      fileName,
      fileSize: file.fileSize,
      mimeType: file.mimeType,
      tokenId: resolved.data.tokenId,
      expiresAt,
    };
    uploads.push({
      requestId: request.id,
      path,
      uploadToken: data.token,
      receipt: createUploadReceipt(payload),
    });
  }

  return { ok: true, data: { uploads } };
}

/** Registers objects only after the browser has uploaded them to Supabase. */
export async function finalizeDocumentUploads(
  token: string,
  receipts: string[],
): Promise<ActionResult<{ count: number }>> {
  const resolved = await resolveToken(token, "DOCUMENTS");
  if (!resolved.ok)
    return { ok: false, message: "This link is no longer valid." };
  if (!(await hasDocumentAccess(resolved.data.tokenId))) {
    return {
      ok: false,
      message: "Verify your email before uploading documents.",
    };
  }
  if (!resolved.data.applicationId) {
    return { ok: false, message: "That application no longer exists." };
  }
  if (!Array.isArray(receipts)) {
    return { ok: false, message: "The upload confirmation is invalid." };
  }

  const payloads = receipts.map(readUploadReceipt);
  if (payloads.some((payload) => !payload)) {
    return { ok: false, message: "The upload confirmation is invalid." };
  }
  const uploads = payloads as UploadReceiptPayload[];
  if (
    uploads.some(
      (upload) =>
        upload.applicationId !== resolved.data.applicationId ||
        upload.tokenId !== resolved.data.tokenId ||
        upload.expiresAt < Date.now() ||
        validateUploadMetadata(upload) !== null,
    )
  ) {
    return {
      ok: false,
      message: "The secure upload expired. Please try again.",
    };
  }

  const supabase = createAdminClient();
  const { data: requests } = await supabase
    .from("document_requests")
    .select("id, application_id, document_type, status")
    .eq("application_id", resolved.data.applicationId)
    .in("status", ["REQUESTED", "REUPLOAD_REQUIRED"])
    .order("requested_at");

  const outstanding = requests ?? [];
  const expectedById = new Map(
    outstanding.map((request) => [request.id, request]),
  );
  if (
    uploads.length !== outstanding.length ||
    new Set(uploads.map((upload) => upload.requestId)).size !==
      uploads.length ||
    uploads.some((upload) => {
      const request = expectedById.get(upload.requestId);
      return !request || request.document_type !== upload.documentType;
    })
  ) {
    await removeUnregisteredPreparedObjects(uploads);
    return {
      ok: false,
      message: "The requested document list changed. Please try again.",
    };
  }

  const requestIds = outstanding.map((request) => request.id);
  const { data: previous } = await supabase
    .from("documents")
    .select("document_request_id, version")
    .in("document_request_id", requestIds)
    .order("version", { ascending: false });
  const latestVersion = new Map<string, number>();
  for (const document of previous ?? []) {
    if (!latestVersion.has(document.document_request_id)) {
      latestVersion.set(document.document_request_id, document.version);
    }
  }
  if (
    uploads.some(
      (upload) =>
        upload.version !== (latestVersion.get(upload.requestId) ?? 0) + 1,
    )
  ) {
    await removeUnregisteredPreparedObjects(uploads);
    return { ok: false, message: "A newer document version already exists." };
  }

  const objectChecks = await Promise.all(
    uploads.map(async (upload) => {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKETS.documents)
        .info(upload.path);
      return {
        ok:
          !error &&
          data?.size === upload.fileSize &&
          data.contentType === upload.mimeType,
      };
    }),
  );
  if (objectChecks.some((check) => !check.ok)) {
    await removeUnregisteredPreparedObjects(uploads);
    return {
      ok: false,
      message:
        "One or more files did not upload correctly. Please choose them again.",
    };
  }

  const inserts = uploads.map((upload) => ({
    document_request_id: upload.requestId,
    application_id: upload.applicationId,
    document_type: upload.documentType,
    storage_path: upload.path,
    file_name: upload.fileName,
    file_size: upload.fileSize,
    mime_type: upload.mimeType,
    version: upload.version,
    status: "UPLOADED" as const,
  }));
  const { data: inserted, error: insertError } = await supabase
    .from("documents")
    .insert(inserts)
    .select("id");

  if (insertError) {
    await removeUnregisteredPreparedObjects(uploads);
    return { ok: false, message: insertError.message };
  }

  const { error: updateError } = await supabase
    .from("document_requests")
    .update({ status: "UPLOADED" })
    .in("id", requestIds)
    .in("status", ["REQUESTED", "REUPLOAD_REQUIRED"]);

  if (updateError) {
    await supabase
      .from("documents")
      .delete()
      .in(
        "id",
        (inserted ?? []).map((document) => document.id),
      );
    await removeUnregisteredPreparedObjects(uploads);
    return { ok: false, message: updateError.message };
  }

  await syncDocumentStatus(resolved.data.applicationId, resolved.data.leadId);
  refresh(resolved.data.leadId);
  return { ok: true, data: { count: inserts.length } };
}

/** Best-effort cleanup if a browser-side direct upload fails midway. */
export async function discardDocumentUploads(
  token: string,
  receipts: string[],
): Promise<ActionResult> {
  const resolved = await resolveToken(token, "DOCUMENTS");
  if (!resolved.ok || !Array.isArray(receipts)) {
    return { ok: false, message: "This link is no longer valid." };
  }
  if (!(await hasDocumentAccess(resolved.data.tokenId))) {
    return {
      ok: false,
      message: "Verify your email before uploading documents.",
    };
  }

  const payloads = receipts
    .map(readUploadReceipt)
    .filter((payload): payload is UploadReceiptPayload => Boolean(payload))
    .filter(
      (payload) =>
        payload.applicationId === resolved.data.applicationId &&
        payload.tokenId === resolved.data.tokenId,
    );

  if (payloads.length > 0) {
    await removeUnregisteredPreparedObjects(payloads);
  }
  return { ok: true };
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

  if (!document)
    return { ok: false, message: "That document no longer exists." };
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

  if (!document)
    return { ok: false, message: "That document no longer exists." };

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

  if (!application)
    return { ok: false, message: "That application no longer exists." };

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

  if (!document)
    return { ok: false, message: "That document no longer exists." };

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

  if (!document)
    return { ok: false, message: "That document no longer exists." };

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
  const url = await signedUrlFor(
    STORAGE_BUCKETS.documents,
    document.storage_path,
    {
      download: download ? document.file_name : undefined,
    },
  );

  return url
    ? { ok: true, data: { url } }
    : { ok: false, message: "Could not open that file." };
}
