import type { LeadStatus } from "./enums";

/**
 * Allowed lead-status moves. Anything not listed is rejected server-side so a
 * stale tab or a hand-crafted request cannot skip an approval gate.
 */
const TRANSITIONS: Record<LeadStatus, readonly LeadStatus[]> = {
  NEW: ["ASSIGNED", "CONTACTED", "REJECTED"],
  ASSIGNED: ["CONTACTED", "FOLLOW_UP", "REJECTED"],
  CONTACTED: ["BUSINESS_DISCUSSION", "FOLLOW_UP", "ACCEPTED", "REJECTED"],
  BUSINESS_DISCUSSION: ["FOLLOW_UP", "ACCEPTED", "REJECTED"],
  FOLLOW_UP: ["CONTACTED", "BUSINESS_DISCUSSION", "ACCEPTED", "REJECTED"],
  ACCEPTED: ["APPLICATION_LINK_SENT", "REJECTED"],
  REJECTED: [],
  APPLICATION_LINK_SENT: ["APPLICATION_IN_PROGRESS", "APPLICATION_SUBMITTED"],
  APPLICATION_IN_PROGRESS: ["APPLICATION_SUBMITTED"],
  APPLICATION_SUBMITTED: ["APPLICATION_UNDER_REVIEW"],
  APPLICATION_UNDER_REVIEW: ["DOCUMENTS_PENDING", "REJECTED"],
  DOCUMENTS_PENDING: [
    "DOCUMENTS_PARTIALLY_SUBMITTED",
    "DOCUMENTS_UNDER_REVIEW",
  ],
  DOCUMENTS_PARTIALLY_SUBMITTED: [
    "DOCUMENTS_UNDER_REVIEW",
    "DOCUMENT_CORRECTION_REQUIRED",
  ],
  DOCUMENTS_UNDER_REVIEW: [
    "DOCUMENT_CORRECTION_REQUIRED",
    "DOCUMENTS_APPROVED",
  ],
  DOCUMENT_CORRECTION_REQUIRED: [
    "DOCUMENTS_PARTIALLY_SUBMITTED",
    "DOCUMENTS_UNDER_REVIEW",
    "DOCUMENTS_APPROVED",
  ],
  DOCUMENTS_APPROVED: ["FRANCHISE_APPROVED", "REJECTED"],
  FRANCHISE_APPROVED: ["AGREEMENT_PENDING"],
  AGREEMENT_PENDING: ["AGREEMENT_SENT"],
  AGREEMENT_SENT: ["AGREEMENT_COMPLETED"],
  AGREEMENT_COMPLETED: ["PAYMENT_PENDING"],
  PAYMENT_PENDING: ["PAYMENT_PROOF_SUBMITTED"],
  PAYMENT_PROOF_SUBMITTED: ["PAYMENT_APPROVED", "PAYMENT_REJECTED"],
  PAYMENT_REJECTED: ["PAYMENT_PROOF_SUBMITTED"],
  PAYMENT_APPROVED: ["READY_FOR_ACTIVATION"],
  READY_FOR_ACTIVATION: ["ACTIVE"],
  ACTIVE: ["TRAINING_PENDING"],
  TRAINING_PENDING: ["TRAINING_SCHEDULED"],
  TRAINING_SCHEDULED: ["TRAINING_IN_PROGRESS", "TRAINING_COMPLETED"],
  TRAINING_IN_PROGRESS: ["TRAINING_COMPLETED"],
  TRAINING_COMPLETED: ["SETUP_PENDING"],
  SETUP_PENDING: ["SETUP_IN_PROGRESS"],
  SETUP_IN_PROGRESS: ["SETUP_COMPLETED"],
  SETUP_COMPLETED: ["READY_TO_GO_LIVE"],
  READY_TO_GO_LIVE: ["LIVE"],
  LIVE: ["ONGOING_SUPPORT"],
  ONGOING_SUPPORT: [],
};

export function allowedNextStatuses(from: LeadStatus): readonly LeadStatus[] {
  return TRANSITIONS[from] ?? [];
}

export function canTransition(from: LeadStatus, to: LeadStatus): boolean {
  if (from === to) return true;
  return allowedNextStatuses(from).includes(to);
}

export function assertTransition(from: LeadStatus, to: LeadStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Cannot move a lead from ${from} to ${to}.`);
  }
}

/** Rejection is only meaningful before the franchise is approved. */
export function isTerminal(status: LeadStatus): boolean {
  return allowedNextStatuses(status).length === 0;
}

/**
 * Franchise approval gate (spec §16): the application must be submitted,
 * a business discussion recorded, and every requested document approved.
 */
export function canApproveFranchise(input: {
  applicationSubmitted: boolean;
  businessDiscussionRecorded: boolean;
  allDocumentsApproved: boolean;
}): boolean {
  return (
    input.applicationSubmitted &&
    input.businessDiscussionRecorded &&
    input.allDocumentsApproved
  );
}
