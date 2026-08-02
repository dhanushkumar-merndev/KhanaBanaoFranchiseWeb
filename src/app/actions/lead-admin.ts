"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { STORAGE_BUCKETS } from "@/lib/domain/enums";
import type {
  LeadExportFile,
  LeadExportPackage,
  LeadExportRow,
  LeadExportSheet,
} from "@/lib/lead-export";
import { createAdminClient } from "@/lib/supabase/admin";
import { signedUrlFor, type BucketName } from "@/lib/storage";
import type { Json } from "@/lib/supabase/types";
import type { ActionResult } from "@/lib/validation/result";

type FileSpec = Omit<LeadExportFile, "url"> & {
  bucket: BucketName;
  storagePath: string;
};

type DeletedStoragePaths = {
  documents: string[];
  agreements: string[];
  paymentProofs: string[];
  approvalLetters: string[];
  training: string[];
};

function rows(value: unknown[] | null | undefined): LeadExportRow[] {
  return (value ?? []) as LeadExportRow[];
}

function fileNameFromPath(path: string, fallback: string): string {
  return path.split("/").filter(Boolean).at(-1) || fallback;
}

function listFromJson(value: Json | undefined): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function deletedPaths(value: Json): DeletedStoragePaths {
  const object = value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
  return {
    documents: listFromJson(object.documents),
    agreements: listFromJson(object.agreements),
    paymentProofs: listFromJson(object.paymentProofs),
    approvalLetters: listFromJson(object.approvalLetters),
    training: listFromJson(object.training),
  };
}

function refreshLeadQueues() {
  for (const path of [
    "/admin",
    "/admin/leads",
    "/admin/follow-ups",
    "/admin/applications",
    "/admin/documents",
    "/admin/agreements",
    "/admin/payments",
    "/admin/franchises",
    "/admin/training",
    "/admin/setup",
    "/admin/email-logs",
    "/admin/activity",
    "/member",
    "/member/leads",
    "/member/follow-ups",
    "/member/applications",
    "/member/documents",
    "/member/payments",
  ]) {
    revalidatePath(path);
  }
}

/**
 * Returns serialisable data plus short-lived signed file URLs. The browser
 * builds the workbook and ZIP; no archive bytes pass through the Next server.
 */
export async function prepareLeadExport(
  leadId: string,
): Promise<ActionResult<LeadExportPackage>> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .maybeSingle();

  if (leadError) return { ok: false, message: leadError.message };
  if (!lead) return { ok: false, message: "That lead no longer exists." };

  const [
    assignmentsResult,
    activitiesResult,
    followupsResult,
    applicationResult,
    agreementsResult,
    paymentsResult,
    franchiseResult,
    emailsResult,
  ] = await Promise.all([
    supabase.from("lead_assignments").select("*").eq("lead_id", leadId).order("created_at"),
    supabase.from("lead_activities").select("*").eq("lead_id", leadId).order("created_at"),
    supabase.from("followups").select("*").eq("lead_id", leadId).order("created_at"),
    supabase.from("applications").select("*").eq("lead_id", leadId).maybeSingle(),
    supabase.from("agreements").select("*").eq("lead_id", leadId).order("version"),
    supabase.from("payments").select("*").eq("lead_id", leadId).order("created_at"),
    supabase.from("franchises").select("*").eq("lead_id", leadId).maybeSingle(),
    supabase.from("email_logs").select("*").eq("lead_id", leadId).order("created_at"),
  ]);

  const firstError = [
    assignmentsResult,
    activitiesResult,
    followupsResult,
    applicationResult,
    agreementsResult,
    paymentsResult,
    franchiseResult,
    emailsResult,
  ].find((result) => result.error)?.error;
  if (firstError) return { ok: false, message: firstError.message };

  const application = applicationResult.data;
  const franchise = franchiseResult.data;

  const [tokensResult, requestsResult, documentsResult, trainingResult, setupResult] =
    await Promise.all([
      supabase
        .from("application_tokens")
        .select(
          "id, lead_id, application_id, purpose, expires_at, used_at, revoked_at, document_otp_expires_at, document_otp_attempts, document_otp_sent_at, document_otp_send_count, document_otp_window_started_at, document_otp_verified_at, created_by, created_at",
        )
        .eq("lead_id", leadId)
        .order("created_at"),
      application
        ? supabase
            .from("document_requests")
            .select("*")
            .eq("application_id", application.id)
            .order("requested_at")
        : Promise.resolve({ data: [], error: null }),
      application
        ? supabase
            .from("documents")
            .select("*")
            .eq("application_id", application.id)
            .order("uploaded_at")
        : Promise.resolve({ data: [], error: null }),
      franchise
        ? supabase
            .from("training_records")
            .select("*")
            .eq("franchise_id", franchise.id)
            .order("created_at")
        : Promise.resolve({ data: [], error: null }),
      franchise
        ? supabase
            .from("setup_items")
            .select("*")
            .eq("franchise_id", franchise.id)
            .order("sort_order")
        : Promise.resolve({ data: [], error: null }),
    ]);

  const relatedError = [
    tokensResult,
    requestsResult,
    documentsResult,
    trainingResult,
    setupResult,
  ].find((result) => result.error)?.error;
  if (relatedError) return { ok: false, message: relatedError.message };

  const documents = documentsResult.data ?? [];
  const documentIds = documents.map((document) => document.id);
  const reviewsResult = documentIds.length
    ? await supabase
        .from("document_reviews")
        .select("*")
        .in("document_id", documentIds)
        .order("created_at")
    : { data: [], error: null };
  if (reviewsResult.error) return { ok: false, message: reviewsResult.error.message };

  const entityIds = [
    lead.id,
    application?.id,
    franchise?.id,
    ...(assignmentsResult.data ?? []).map((item) => item.id),
    ...(activitiesResult.data ?? []).map((item) => item.id),
    ...(followupsResult.data ?? []).map((item) => item.id),
    ...(tokensResult.data ?? []).map((item) => item.id),
    ...(requestsResult.data ?? []).map((item) => item.id),
    ...documents.map((item) => item.id),
    ...(reviewsResult.data ?? []).map((item) => item.id),
    ...(agreementsResult.data ?? []).map((item) => item.id),
    ...(paymentsResult.data ?? []).map((item) => item.id),
    ...(trainingResult.data ?? []).map((item) => item.id),
    ...(setupResult.data ?? []).map((item) => item.id),
  ].filter((id): id is string => Boolean(id));

  const auditResult = await supabase
    .from("activity_logs")
    .select("*")
    .in("entity_id", entityIds)
    .order("created_at");
  if (auditResult.error) return { ok: false, message: auditResult.error.message };

  const profileIds = [
    lead.assigned_member_id,
    lead.created_by,
    ...(assignmentsResult.data ?? []).flatMap((item) => [
      item.member_id,
      item.previous_member_id,
      item.assigned_by,
    ]),
    ...(activitiesResult.data ?? []).map((item) => item.member_id),
    ...(followupsResult.data ?? []).flatMap((item) => [item.member_id, item.created_by]),
    application?.reviewed_by,
    ...(requestsResult.data ?? []).map((item) => item.requested_by),
    ...documents.map((item) => item.reviewed_by),
    ...(reviewsResult.data ?? []).map((item) => item.reviewer_id),
    ...(agreementsResult.data ?? []).map((item) => item.created_by),
    ...(paymentsResult.data ?? []).flatMap((item) => [item.submitted_by, item.reviewed_by]),
    franchise?.support_owner,
    franchise?.activated_by,
    ...(trainingResult.data ?? []).map((item) => item.created_by),
    ...(setupResult.data ?? []).map((item) => item.completed_by),
    ...(emailsResult.data ?? []).map((item) => item.triggered_by),
    ...(auditResult.data ?? []).map((item) => item.actor_id),
  ].filter((id): id is string => Boolean(id));

  const uniqueProfileIds = [...new Set(profileIds)];
  const profilesResult = uniqueProfileIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, email, phone, role, status, created_at, updated_at")
        .in("id", uniqueProfileIds)
        .order("full_name")
    : { data: [], error: null };
  if (profilesResult.error) return { ok: false, message: profilesResult.error.message };

  const fileSpecs: FileSpec[] = [];
  for (const document of documents) {
    fileSpecs.push({
      category: "Applicant document",
      folder: `Documents/Applicant Documents/${document.document_type}`,
      fileName: `v${document.version}-${document.file_name}`,
      sourceName: document.file_name,
      size: Number(document.file_size),
      status: document.status,
      bucket: STORAGE_BUCKETS.documents,
      storagePath: document.storage_path,
    });
  }
  for (const agreement of agreementsResult.data ?? []) {
    if (!agreement.storage_path) continue;
    const sourceName = agreement.file_name || `${agreement.agreement_number}.pdf`;
    fileSpecs.push({
      category: "Agreement",
      folder: "Documents/Agreements",
      fileName: `v${agreement.version}-${sourceName}`,
      sourceName,
      size: null,
      status: agreement.status,
      bucket: STORAGE_BUCKETS.agreements,
      storagePath: agreement.storage_path,
    });
  }
  for (const payment of paymentsResult.data ?? []) {
    if (!payment.proof_storage_path) continue;
    const sourceName = payment.proof_file_name || "payment-proof";
    fileSpecs.push({
      category: "Payment proof",
      folder: "Documents/Payment Proofs",
      fileName: `${payment.payment_date || payment.created_at.slice(0, 10)}-${sourceName}`,
      sourceName,
      size: null,
      status: payment.status,
      bucket: STORAGE_BUCKETS.paymentProofs,
      storagePath: payment.proof_storage_path,
    });
  }
  if (application?.approval_letter_path) {
    const sourceName = fileNameFromPath(
      application.approval_letter_path,
      `${application.application_number}-approval-letter.pdf`,
    );
    fileSpecs.push({
      category: "Approval letter",
      folder: "Documents/Approval Letter",
      fileName: sourceName,
      sourceName,
      size: null,
      status: application.status,
      bucket: STORAGE_BUCKETS.approvalLetters,
      storagePath: application.approval_letter_path,
    });
  }
  for (const training of trainingResult.data ?? []) {
    if (!training.document_path) continue;
    const sourceName = fileNameFromPath(training.document_path, "training-document");
    fileSpecs.push({
      category: "Training document",
      folder: "Documents/Training",
      fileName: `${training.module}-${sourceName}`,
      sourceName,
      size: null,
      status: training.status,
      bucket: STORAGE_BUCKETS.training,
      storagePath: training.document_path,
    });
  }

  const files = await Promise.all(
    fileSpecs.map(async ({ bucket, storagePath, ...file }) => ({
      ...file,
      url: await signedUrlFor(bucket, storagePath, { download: file.sourceName }),
    })),
  );

  const sheets: LeadExportSheet[] = [
    { name: "Lead", rows: [lead as unknown as LeadExportRow] },
    { name: "Assignments", rows: rows(assignmentsResult.data) },
    { name: "Activities", rows: rows(activitiesResult.data) },
    { name: "Follow-ups", rows: rows(followupsResult.data) },
    { name: "Application", rows: application ? [application as unknown as LeadExportRow] : [] },
    { name: "Access Links", rows: rows(tokensResult.data) },
    { name: "Document Requests", rows: rows(requestsResult.data) },
    { name: "Documents", rows: rows(documents) },
    { name: "Document Reviews", rows: rows(reviewsResult.data) },
    { name: "Agreements", rows: rows(agreementsResult.data) },
    { name: "Payments", rows: rows(paymentsResult.data) },
    { name: "Franchise", rows: franchise ? [franchise as unknown as LeadExportRow] : [] },
    { name: "Training", rows: rows(trainingResult.data) },
    { name: "Setup", rows: rows(setupResult.data) },
    { name: "Emails", rows: rows(emailsResult.data) },
    { name: "Audit Log", rows: rows(auditResult.data) },
    { name: "Related Staff", rows: rows(profilesResult.data) },
  ];

  return {
    ok: true,
    data: {
      leadNumber: lead.lead_number,
      leadName: lead.full_name,
      generatedAt: new Date().toISOString(),
      sheets,
      files,
    },
  };
}

/** Permanently deletes the database graph first, then its private files. */
export async function deleteLeadPermanently(
  leadId: string,
): Promise<ActionResult<{ cleanupWarning: string | null }>> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("admin_delete_lead_cascade", {
    target_lead: leadId,
  });
  if (error) {
    return {
      ok: false,
      message:
        error.message === "Lead not found"
          ? "That lead no longer exists."
          : error.message,
    };
  }

  const paths = deletedPaths(data);
  const groups: { bucket: BucketName; paths: string[] }[] = [
    { bucket: STORAGE_BUCKETS.documents, paths: paths.documents },
    { bucket: STORAGE_BUCKETS.agreements, paths: paths.agreements },
    { bucket: STORAGE_BUCKETS.paymentProofs, paths: paths.paymentProofs },
    { bucket: STORAGE_BUCKETS.approvalLetters, paths: paths.approvalLetters },
    { bucket: STORAGE_BUCKETS.training, paths: paths.training },
  ];

  const cleanupResults = await Promise.all(
    groups.map(async ({ bucket, paths: bucketPaths }) => {
      const unique = [...new Set(bucketPaths)];
      if (unique.length === 0) return null;
      const { error: cleanupError } = await supabase.storage.from(bucket).remove(unique);
      return cleanupError ? `${bucket}: ${cleanupError.message}` : null;
    }),
  );

  refreshLeadQueues();
  const failures = cleanupResults.filter((message): message is string => Boolean(message));
  return {
    ok: true,
    data: {
      cleanupWarning:
        failures.length > 0
          ? "The lead was deleted, but some unreferenced storage files could not be removed."
          : null,
    },
  };
}
