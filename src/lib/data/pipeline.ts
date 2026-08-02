import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveMemberNames } from "./leads";
import type {
  AgreementStatus,
  ApplicationStatus,
  DocumentStatus,
  DocumentType,
  EmailLogStatus,
  FranchiseStatus,
  PaymentMode,
  PaymentStatus,
  TrainingStatus,
} from "@/lib/domain/enums";
import type { Json } from "@/lib/supabase/types";

export type ApplicationDetail = {
  id: string;
  application_number: string;
  status: ApplicationStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  reviewedByName: string | null;
  personal_details: Json;
  address_details: Json;
  business_details: Json;
  franchise_details: Json;
  financial_details: Json;
  declaration: Json;
  approved_territory: string | null;
  approved_franchise_model: string | null;
  approved_investment: number | null;
  approval_notes: string | null;
  hasApprovalLetter: boolean;
};

export type DocumentRow = {
  requestId: string;
  documentType: DocumentType;
  requestStatus: DocumentStatus;
  requestNote: string | null;
  requestedAt: string;
  /** Newest version, or null when nothing has been uploaded yet. */
  document: {
    id: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    version: number;
    status: DocumentStatus;
    uploadedAt: string;
    reviewedAt: string | null;
    reviewedByName: string | null;
    rejectionReason: string | null;
  } | null;
  history: {
    id: string;
    decision: DocumentStatus;
    note: string | null;
    createdAt: string;
    reviewerName: string | null;
  }[];
};

export type AgreementDetail = {
  id: string;
  agreement_number: string;
  version: number;
  status: AgreementStatus;
  file_name: string | null;
  hasFile: boolean;
  sent_at: string | null;
  applicant_signed_at: string | null;
  company_signed_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  createdByName: string | null;
};

export type PaymentDetail = {
  id: string;
  amount: number;
  payment_mode: PaymentMode;
  reference_number: string | null;
  payment_date: string | null;
  status: PaymentStatus;
  proof_file_name: string | null;
  hasProof: boolean;
  submitted_at: string | null;
  submittedByName: string | null;
  reviewed_at: string | null;
  reviewedByName: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
};

export type FranchiseDetail = {
  id: string;
  franchise_id: string;
  franchise_name: string;
  owner_name: string;
  territory: string | null;
  crm_login_email: string | null;
  dashboard_url: string | null;
  support_contact: string | null;
  supportOwnerName: string | null;
  activation_date: string | null;
  go_live_date: string | null;
  status: FranchiseStatus;
  remarks: string | null;
  notes: string | null;
  activatedByName: string | null;
  training: {
    id: string;
    module: string;
    trainer: string | null;
    scheduled_at: string | null;
    venue: string | null;
    attendance: string | null;
    status: TrainingStatus;
    notes: string | null;
    completed_at: string | null;
  }[];
  setup: {
    id: string;
    label: string;
    is_done: boolean;
    note: string | null;
    completed_at: string | null;
    completedByName: string | null;
  }[];
};

export type EmailLogRow = {
  id: string;
  /** Null for ad-hoc sends that did not come from a stored template. */
  template_key: string | null;
  to_email: string;
  subject: string;
  body_preview: string | null;
  status: EmailLogStatus;
  error_message: string | null;
  created_at: string;
  triggeredByName: string | null;
};

export type LeadPipeline = {
  application: ApplicationDetail | null;
  documents: DocumentRow[];
  agreement: AgreementDetail | null;
  payments: PaymentDetail[];
  franchise: FranchiseDetail | null;
  emails: EmailLogRow[];
};

/**
 * Everything the later lead-detail tabs render, in one pass.
 *
 * Fetched together rather than per-tab because the tab strip shows counts for
 * all of them at once — lazy-loading each tab would mean the badges lie until
 * you click.
 */
export async function getLeadPipeline(leadId: string): Promise<LeadPipeline> {
  const supabase = createAdminClient();

  const [
    { data: application },
    { data: agreement },
    { data: payments },
    { data: franchise },
    { data: emails },
  ] = await Promise.all([
    supabase.from("applications").select("*").eq("lead_id", leadId).maybeSingle(),
    supabase
      .from("agreements")
      .select("*")
      .eq("lead_id", leadId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("payments")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false }),
    supabase.from("franchises").select("*").eq("lead_id", leadId).maybeSingle(),
    supabase
      .from("email_logs")
      .select(
        "id, template_key, to_email, subject, body_preview, status, error_message, created_at, triggered_by",
      )
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const documents = application
    ? await loadDocuments(application.id)
    : [];

  const training = franchise
    ? ((
        await supabase
          .from("training_records")
          .select("*")
          .eq("franchise_id", franchise.id)
          .order("scheduled_at", { ascending: true })
      ).data ?? [])
    : [];

  const setup = franchise
    ? ((
        await supabase
          .from("setup_items")
          .select("*")
          .eq("franchise_id", franchise.id)
          .order("sort_order")
      ).data ?? [])
    : [];

  const names = await resolveMemberNames([
    application?.reviewed_by ?? null,
    agreement?.created_by ?? null,
    franchise?.activated_by ?? null,
    franchise?.support_owner ?? null,
    ...(payments ?? []).flatMap((p) => [p.submitted_by, p.reviewed_by]),
    ...(emails ?? []).map((e) => e.triggered_by),
    ...setup.map((item) => item.completed_by),
  ]);

  return {
    application: application
      ? {
          id: application.id,
          application_number: application.application_number,
          status: application.status,
          submitted_at: application.submitted_at,
          reviewed_at: application.reviewed_at,
          review_notes: application.review_notes,
          reviewedByName: application.reviewed_by
            ? (names.get(application.reviewed_by) ?? null)
            : null,
          personal_details: application.personal_details,
          address_details: application.address_details,
          business_details: application.business_details,
          franchise_details: application.franchise_details,
          financial_details: application.financial_details,
          declaration: application.declaration,
          approved_territory: application.approved_territory,
          approved_franchise_model: application.approved_franchise_model,
          approved_investment: application.approved_investment,
          approval_notes: application.approval_notes,
          hasApprovalLetter: Boolean(application.approval_letter_path),
        }
      : null,
    documents,
    agreement: agreement
      ? {
          id: agreement.id,
          agreement_number: agreement.agreement_number,
          version: agreement.version,
          status: agreement.status,
          file_name: agreement.file_name,
          hasFile: Boolean(agreement.storage_path),
          sent_at: agreement.sent_at,
          applicant_signed_at: agreement.applicant_signed_at,
          company_signed_at: agreement.company_signed_at,
          completed_at: agreement.completed_at,
          notes: agreement.notes,
          created_at: agreement.created_at,
          createdByName: agreement.created_by
            ? (names.get(agreement.created_by) ?? null)
            : null,
        }
      : null,
    payments: (payments ?? []).map((payment) => ({
      id: payment.id,
      amount: Number(payment.amount),
      payment_mode: payment.payment_mode,
      reference_number: payment.reference_number,
      payment_date: payment.payment_date,
      status: payment.status,
      proof_file_name: payment.proof_file_name,
      hasProof: Boolean(payment.proof_storage_path),
      submitted_at: payment.submitted_at,
      submittedByName: payment.submitted_by
        ? (names.get(payment.submitted_by) ?? null)
        : null,
      reviewed_at: payment.reviewed_at,
      reviewedByName: payment.reviewed_by
        ? (names.get(payment.reviewed_by) ?? null)
        : null,
      rejection_reason: payment.rejection_reason,
      notes: payment.notes,
      created_at: payment.created_at,
    })),
    franchise: franchise
      ? {
          id: franchise.id,
          franchise_id: franchise.franchise_id,
          franchise_name: franchise.franchise_name,
          owner_name: franchise.owner_name,
          territory: franchise.territory,
          crm_login_email: franchise.crm_login_email,
          dashboard_url: franchise.dashboard_url,
          support_contact: franchise.support_contact,
          supportOwnerName: franchise.support_owner
            ? (names.get(franchise.support_owner) ?? null)
            : null,
          activation_date: franchise.activation_date,
          go_live_date: franchise.go_live_date,
          status: franchise.status,
          remarks: franchise.remarks,
          notes: franchise.notes,
          activatedByName: franchise.activated_by
            ? (names.get(franchise.activated_by) ?? null)
            : null,
          training: training.map((record) => ({
            id: record.id,
            module: record.module,
            trainer: record.trainer,
            scheduled_at: record.scheduled_at,
            venue: record.venue,
            attendance: record.attendance,
            status: record.status,
            notes: record.notes,
            completed_at: record.completed_at,
          })),
          setup: setup.map((item) => ({
            id: item.id,
            label: item.label,
            is_done: item.is_done,
            note: item.note,
            completed_at: item.completed_at,
            completedByName: item.completed_by
              ? (names.get(item.completed_by) ?? null)
              : null,
          })),
        }
      : null,
    emails: (emails ?? []).map((log) => ({
      id: log.id,
      template_key: log.template_key,
      to_email: log.to_email,
      subject: log.subject,
      body_preview: log.body_preview,
      status: log.status,
      error_message: log.error_message,
      created_at: log.created_at,
      triggeredByName: log.triggered_by
        ? (names.get(log.triggered_by) ?? null)
        : null,
    })),
  };
}

async function loadDocuments(applicationId: string): Promise<DocumentRow[]> {
  const supabase = createAdminClient();

  const { data: requests } = await supabase
    .from("document_requests")
    .select("*")
    .eq("application_id", applicationId)
    .order("requested_at");

  if (!requests || requests.length === 0) return [];

  const documents =
    (
      await supabase
        .from("documents")
        .select("*")
        .eq("application_id", applicationId)
        .order("version", { ascending: false })
    ).data ?? [];

  const documentIds = documents.map((document) => document.id);

  const { data: reviews } = documentIds.length
    ? await supabase
        .from("document_reviews")
        .select("*")
        .in("document_id", documentIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const names = await resolveMemberNames([
    ...(documents ?? []).map((document) => document.reviewed_by),
    ...(reviews ?? []).map((review) => review.reviewer_id),
  ]);

  // Only the newest version per request is actionable; earlier ones live in
  // the review history below it.
  const latest = new Map<string, (typeof documents)[number]>();
  for (const document of documents ?? []) {
    if (!latest.has(document.document_request_id)) {
      latest.set(document.document_request_id, document);
    }
  }

  return requests.map((request) => {
    const document = latest.get(request.id);
    return {
      requestId: request.id,
      documentType: request.document_type,
      requestStatus: request.status,
      requestNote: request.request_note,
      requestedAt: request.requested_at,
      document: document
        ? {
            id: document.id,
            fileName: document.file_name,
            fileSize: Number(document.file_size),
            mimeType: document.mime_type,
            version: document.version,
            status: document.status,
            uploadedAt: document.uploaded_at,
            reviewedAt: document.reviewed_at,
            reviewedByName: document.reviewed_by
              ? (names.get(document.reviewed_by) ?? null)
              : null,
            rejectionReason: document.rejection_reason,
          }
        : null,
      history: (reviews ?? [])
        .filter((review) => review.document_id === document?.id)
        .map((review) => ({
          id: review.id,
          decision: review.decision,
          note: review.note,
          createdAt: review.created_at,
          reviewerName: review.reviewer_id
            ? (names.get(review.reviewer_id) ?? null)
            : null,
        })),
    };
  });
}
