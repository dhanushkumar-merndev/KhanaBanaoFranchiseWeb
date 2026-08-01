import type {
  AgreementStatus,
  DocumentStatus,
  FollowupStatus,
  FranchiseStatus,
  LeadStatus,
  PaymentStatus,
} from "./enums";

/**
 * Badge tones. Colour is never the only signal — every badge also renders its
 * label — but the tone gives the table a fast visual scan.
 */
export type StatusTone =
  | "neutral"
  | "info"
  | "progress"
  | "warn"
  | "success"
  | "danger";

const LEAD_TONES: Partial<Record<LeadStatus, StatusTone>> = {
  NEW: "info",
  ASSIGNED: "info",
  CONTACTED: "progress",
  BUSINESS_DISCUSSION: "progress",
  FOLLOW_UP: "warn",
  ACCEPTED: "success",
  REJECTED: "danger",
  APPLICATION_LINK_SENT: "progress",
  APPLICATION_IN_PROGRESS: "progress",
  APPLICATION_SUBMITTED: "progress",
  APPLICATION_UNDER_REVIEW: "progress",
  DOCUMENTS_PENDING: "warn",
  DOCUMENTS_PARTIALLY_SUBMITTED: "warn",
  DOCUMENTS_UNDER_REVIEW: "progress",
  DOCUMENT_CORRECTION_REQUIRED: "warn",
  DOCUMENTS_APPROVED: "success",
  FRANCHISE_APPROVED: "success",
  AGREEMENT_PENDING: "warn",
  AGREEMENT_SENT: "progress",
  AGREEMENT_COMPLETED: "success",
  PAYMENT_PENDING: "warn",
  PAYMENT_PROOF_SUBMITTED: "progress",
  PAYMENT_REJECTED: "danger",
  PAYMENT_APPROVED: "success",
  READY_FOR_ACTIVATION: "info",
  ACTIVE: "info",
  TRAINING_PENDING: "warn",
  TRAINING_SCHEDULED: "progress",
  TRAINING_IN_PROGRESS: "progress",
  TRAINING_COMPLETED: "success",
  SETUP_PENDING: "warn",
  SETUP_IN_PROGRESS: "progress",
  SETUP_COMPLETED: "success",
  READY_TO_GO_LIVE: "info",
  LIVE: "success",
  ONGOING_SUPPORT: "info",
};

export function leadStatusTone(status: LeadStatus): StatusTone {
  return LEAD_TONES[status] ?? "neutral";
}

export function documentStatusTone(status: DocumentStatus): StatusTone {
  switch (status) {
    case "REQUESTED":
      return "neutral";
    case "UPLOADED":
      return "info";
    case "UNDER_REVIEW":
      return "progress";
    case "APPROVED":
      return "success";
    case "REUPLOAD_REQUIRED":
      return "warn";
  }
}

export function paymentStatusTone(status: PaymentStatus): StatusTone {
  switch (status) {
    case "PENDING":
      return "warn";
    case "PROOF_SUBMITTED":
      return "progress";
    case "APPROVED":
      return "success";
    case "REJECTED":
      return "danger";
  }
}

export function agreementStatusTone(status: AgreementStatus): StatusTone {
  switch (status) {
    case "PENDING":
      return "warn";
    case "UPLOADED":
    case "SENT":
    case "SIGNED_BY_APPLICANT":
    case "SIGNED_BY_COMPANY":
      return "progress";
    case "COMPLETED":
      return "success";
  }
}

export function followupStatusTone(status: FollowupStatus): StatusTone {
  switch (status) {
    case "PENDING":
      return "info";
    case "COMPLETED":
      return "success";
    case "OVERDUE":
      return "danger";
    case "CANCELLED":
      return "neutral";
    case "RESCHEDULED":
      return "warn";
  }
}

export function franchiseStatusTone(status: FranchiseStatus): StatusTone {
  switch (status) {
    case "ACTIVE":
      return "info";
    case "TRAINING":
    case "SETUP":
      return "progress";
    case "READY_TO_GO_LIVE":
      return "info";
    case "LIVE":
      return "success";
    case "ONGOING_SUPPORT":
      return "info";
    case "SUSPENDED":
      return "danger";
  }
}

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  REQUESTED: "Requested",
  UPLOADED: "Uploaded",
  UNDER_REVIEW: "Under review",
  APPROVED: "Approved",
  REUPLOAD_REQUIRED: "Re-upload needed",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Pending",
  PROOF_SUBMITTED: "Proof submitted",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const AGREEMENT_STATUS_LABELS: Record<AgreementStatus, string> = {
  PENDING: "Pending",
  UPLOADED: "Uploaded",
  SENT: "Sent",
  SIGNED_BY_APPLICANT: "Signed by applicant",
  SIGNED_BY_COMPANY: "Signed by company",
  COMPLETED: "Completed",
};

export const FOLLOWUP_STATUS_LABELS: Record<FollowupStatus, string> = {
  PENDING: "Pending",
  COMPLETED: "Completed",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
  RESCHEDULED: "Rescheduled",
};

export const FRANCHISE_STATUS_LABELS: Record<FranchiseStatus, string> = {
  ACTIVE: "Active",
  TRAINING: "In training",
  SETUP: "In setup",
  READY_TO_GO_LIVE: "Ready to go live",
  LIVE: "Live",
  ONGOING_SUPPORT: "Ongoing support",
  SUSPENDED: "Suspended",
};
