import type { DocumentStatus, LeadStatus } from "./enums";
import { canTransition } from "./transitions";

const DOCUMENT_LEAD_STAGES = new Set<LeadStatus>([
  "DOCUMENTS_PENDING",
  "DOCUMENTS_PARTIALLY_SUBMITTED",
  "DOCUMENTS_UNDER_REVIEW",
  "DOCUMENT_CORRECTION_REQUIRED",
  "DOCUMENTS_APPROVED",
]);

/**
 * Roll a set of per-document statuses up into the lead-level document status.
 *
 * Precedence (spec §14):
 *   any REUPLOAD_REQUIRED  -> DOCUMENT_CORRECTION_REQUIRED
 *   all APPROVED           -> DOCUMENTS_APPROVED
 *   none uploaded          -> DOCUMENTS_PENDING
 *   some uploaded          -> DOCUMENTS_PARTIALLY_SUBMITTED
 *   all uploaded           -> DOCUMENTS_UNDER_REVIEW
 */
export function overallDocumentStatus(
  statuses: readonly DocumentStatus[],
): LeadStatus {
  if (statuses.length === 0) return "DOCUMENTS_PENDING";

  if (statuses.includes("REUPLOAD_REQUIRED")) {
    return "DOCUMENT_CORRECTION_REQUIRED";
  }

  if (statuses.every((status) => status === "APPROVED")) {
    return "DOCUMENTS_APPROVED";
  }

  const received = statuses.filter(
    (status) =>
      status === "UPLOADED" ||
      status === "UNDER_REVIEW" ||
      status === "APPROVED",
  ).length;

  if (received === 0) return "DOCUMENTS_PENDING";
  if (received < statuses.length) return "DOCUMENTS_PARTIALLY_SUBMITTED";
  return "DOCUMENTS_UNDER_REVIEW";
}

/**
 * Document status is an aggregate, so it may legitimately skip intermediate
 * display stages when several files are reviewed before the lead refreshes.
 */
export function canApplyDocumentRollup(
  from: LeadStatus,
  target: LeadStatus,
): boolean {
  return (
    canTransition(from, target) ||
    (DOCUMENT_LEAD_STAGES.has(target) &&
      (DOCUMENT_LEAD_STAGES.has(from) || from === "APPLICATION_UNDER_REVIEW"))
  );
}

/** Approved documents are locked — the applicant cannot replace them. */
export function isDocumentLocked(status: DocumentStatus): boolean {
  return status === "APPROVED";
}

/** Which documents an applicant is allowed to upload against right now. */
function uploadableStatuses(): readonly DocumentStatus[] {
  return ["REQUESTED", "REUPLOAD_REQUIRED"];
}

export function canApplicantUpload(status: DocumentStatus): boolean {
  return uploadableStatuses().includes(status);
}
