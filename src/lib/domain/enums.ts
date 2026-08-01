/**
 * Domain vocabulary — mirrors the Postgres enums in
 * supabase/migrations/0001_init.sql. Keep the two in step.
 */

export const ROLES = ["ADMIN", "MEMBER"] as const;
export type Role = (typeof ROLES)[number];

export const PROFILE_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type ProfileStatus = (typeof PROFILE_STATUSES)[number];

export const INVITATION_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "EXPIRED",
  "REVOKED",
] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

export const MAX_ACTIVE_MEMBERS = 20;

export const LEAD_SOURCES = [
  "WEBSITE",
  "WHATSAPP",
  "PHONE",
  "REFERRAL",
  "WALK_IN",
  "EMAIL",
  "FACEBOOK",
  "INSTAGRAM",
  "OTHER",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_STATUSES = [
  "NEW",
  "ASSIGNED",
  "CONTACTED",
  "BUSINESS_DISCUSSION",
  "FOLLOW_UP",
  "ACCEPTED",
  "REJECTED",
  "APPLICATION_LINK_SENT",
  "APPLICATION_IN_PROGRESS",
  "APPLICATION_SUBMITTED",
  "APPLICATION_UNDER_REVIEW",
  "DOCUMENTS_PENDING",
  "DOCUMENTS_PARTIALLY_SUBMITTED",
  "DOCUMENTS_UNDER_REVIEW",
  "DOCUMENT_CORRECTION_REQUIRED",
  "DOCUMENTS_APPROVED",
  "FRANCHISE_APPROVED",
  "AGREEMENT_PENDING",
  "AGREEMENT_SENT",
  "AGREEMENT_COMPLETED",
  "PAYMENT_PENDING",
  "PAYMENT_PROOF_SUBMITTED",
  "PAYMENT_REJECTED",
  "PAYMENT_APPROVED",
  "READY_FOR_ACTIVATION",
  "ACTIVE",
  "TRAINING_PENDING",
  "TRAINING_SCHEDULED",
  "TRAINING_IN_PROGRESS",
  "TRAINING_COMPLETED",
  "SETUP_PENDING",
  "SETUP_IN_PROGRESS",
  "SETUP_COMPLETED",
  "READY_TO_GO_LIVE",
  "LIVE",
  "ONGOING_SUPPORT",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const CONTACT_CHANNELS = [
  "PHONE",
  "WHATSAPP",
  "EMAIL",
  "VIDEO_MEETING",
  "OFFICE_MEETING",
  "OTHER",
] as const;
export type ContactChannel = (typeof CONTACT_CHANNELS)[number];

export const DISCUSSION_OUTCOMES = [
  "ACCEPTED",
  "FOLLOW_UP_REQUIRED",
  "REJECTED",
  "UNREACHABLE",
] as const;
export type DiscussionOutcome = (typeof DISCUSSION_OUTCOMES)[number];

export const INTEREST_LEVELS = ["HIGH", "MEDIUM", "LOW"] as const;
export type InterestLevel = (typeof INTEREST_LEVELS)[number];

export const FOLLOWUP_STATUSES = [
  "PENDING",
  "COMPLETED",
  "OVERDUE",
  "CANCELLED",
  "RESCHEDULED",
] as const;
export type FollowupStatus = (typeof FOLLOWUP_STATUSES)[number];

export const APPLICATION_STATUSES = [
  "IN_PROGRESS",
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const DOCUMENT_TYPES = [
  "AADHAAR_CARD",
  "PAN_CARD",
  "PASSPORT_PHOTO",
  "ADDRESS_PROOF",
  "CANCELLED_CHEQUE",
  "GST_CERTIFICATE",
  "BUSINESS_REGISTRATION",
  "PREMISES_PHOTOGRAPHS",
  "BANK_STATEMENT",
  "OTHER",
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  AADHAAR_CARD: "Aadhaar Card",
  PAN_CARD: "PAN Card",
  PASSPORT_PHOTO: "Passport-size Photograph",
  ADDRESS_PROOF: "Address Proof",
  CANCELLED_CHEQUE: "Cancelled Cheque",
  GST_CERTIFICATE: "GST Certificate",
  BUSINESS_REGISTRATION: "Business Registration",
  PREMISES_PHOTOGRAPHS: "Premises Photographs",
  BANK_STATEMENT: "Bank Statement",
  OTHER: "Other",
};

export const DOCUMENT_STATUSES = [
  "REQUESTED",
  "UPLOADED",
  "UNDER_REVIEW",
  "APPROVED",
  "REUPLOAD_REQUIRED",
] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const AGREEMENT_STATUSES = [
  "PENDING",
  "UPLOADED",
  "SENT",
  "SIGNED_BY_APPLICANT",
  "SIGNED_BY_COMPANY",
  "COMPLETED",
] as const;
export type AgreementStatus = (typeof AGREEMENT_STATUSES)[number];

export const PAYMENT_MODES = [
  "BANK_TRANSFER",
  "UPI",
  "CHEQUE",
  "CASH",
  "DEMAND_DRAFT",
  "OTHER",
] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export const PAYMENT_STATUSES = [
  "PENDING",
  "PROOF_SUBMITTED",
  "APPROVED",
  "REJECTED",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const FRANCHISE_STATUSES = [
  "ACTIVE",
  "TRAINING",
  "SETUP",
  "READY_TO_GO_LIVE",
  "LIVE",
  "ONGOING_SUPPORT",
  "SUSPENDED",
] as const;
export type FranchiseStatus = (typeof FRANCHISE_STATUSES)[number];

export const TRAINING_STATUSES = [
  "TRAINING_PENDING",
  "TRAINING_SCHEDULED",
  "TRAINING_IN_PROGRESS",
  "TRAINING_COMPLETED",
] as const;
export type TrainingStatus = (typeof TRAINING_STATUSES)[number];

export const TRAINING_MODULES = [
  "CRM usage",
  "Sales process",
  "Operations",
  "Customer service",
  "Billing",
  "Marketing",
  "Reporting",
] as const;

export const SETUP_CHECKLIST = [
  "CRM configured",
  "Territory configured",
  "Address confirmed",
  "Bank details confirmed",
  "GST details confirmed",
  "Staff details added",
  "Pricing configured",
  "Vendor network prepared",
  "Chef/service network prepared",
  "Marketing assets shared",
  "Test booking completed",
  "Support contact assigned",
] as const;

export const SETUP_STATUSES = [
  "SETUP_PENDING",
  "SETUP_IN_PROGRESS",
  "SETUP_COMPLETED",
] as const;
export type SetupStatus = (typeof SETUP_STATUSES)[number];

export const EMAIL_TEMPLATE_KEYS = [
  "MEMBER_INVITATION",
  "ENQUIRY_RECEIVED",
  "APPLICATION_LINK",
  "APPLICATION_SUBMITTED",
  "DOCUMENT_REQUEST",
  "DOCUMENT_REUPLOAD_REQUEST",
  "APPLICATION_APPROVED",
  "APPLICATION_REJECTED",
  "AGREEMENT_SENT",
  "PAYMENT_APPROVED",
  "PAYMENT_REJECTED",
  "FRANCHISE_ACTIVATED",
  "TRAINING_SCHEDULED",
  "TRAINING_COMPLETED",
  "GO_LIVE_CONFIRMATION",
] as const;
export type EmailTemplateKey = (typeof EMAIL_TEMPLATE_KEYS)[number];

export const EMAIL_LOG_STATUSES = ["SENT", "FAILED", "SKIPPED"] as const;
export type EmailLogStatus = (typeof EMAIL_LOG_STATUSES)[number];

export const STORAGE_BUCKETS = {
  documents: "franchise-documents",
  paymentProofs: "payment-proofs",
  agreements: "franchise-agreements",
  training: "training-documents",
  approvalLetters: "approval-letters",
} as const;

/** Human-friendly wording for the UI — the spec bans raw enum text on screen. */
export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "New",
  ASSIGNED: "Assigned",
  CONTACTED: "Contacted",
  BUSINESS_DISCUSSION: "In discussion",
  FOLLOW_UP: "Follow-up due",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  APPLICATION_LINK_SENT: "Application link sent",
  APPLICATION_IN_PROGRESS: "Application in progress",
  APPLICATION_SUBMITTED: "Application submitted",
  APPLICATION_UNDER_REVIEW: "Application under review",
  DOCUMENTS_PENDING: "Documents pending",
  DOCUMENTS_PARTIALLY_SUBMITTED: "Documents partly received",
  DOCUMENTS_UNDER_REVIEW: "Documents under review",
  DOCUMENT_CORRECTION_REQUIRED: "Document correction needed",
  DOCUMENTS_APPROVED: "Documents approved",
  FRANCHISE_APPROVED: "Franchise approved",
  AGREEMENT_PENDING: "Agreement pending",
  AGREEMENT_SENT: "Agreement sent",
  AGREEMENT_COMPLETED: "Agreement completed",
  PAYMENT_PENDING: "Payment pending",
  PAYMENT_PROOF_SUBMITTED: "Payment proof submitted",
  PAYMENT_REJECTED: "Payment rejected",
  PAYMENT_APPROVED: "Payment approved",
  READY_FOR_ACTIVATION: "Ready for activation",
  ACTIVE: "Active",
  TRAINING_PENDING: "Training pending",
  TRAINING_SCHEDULED: "Training scheduled",
  TRAINING_IN_PROGRESS: "Training in progress",
  TRAINING_COMPLETED: "Training completed",
  SETUP_PENDING: "Setup pending",
  SETUP_IN_PROGRESS: "Setup in progress",
  SETUP_COMPLETED: "Setup completed",
  READY_TO_GO_LIVE: "Ready to go live",
  LIVE: "Live",
  ONGOING_SUPPORT: "Ongoing support",
};

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  WEBSITE: "Website",
  WHATSAPP: "WhatsApp",
  PHONE: "Phone",
  REFERRAL: "Referral",
  WALK_IN: "Walk-in",
  EMAIL: "Email",
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  OTHER: "Other",
};

export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  BANK_TRANSFER: "Bank transfer",
  UPI: "UPI",
  CHEQUE: "Cheque",
  CASH: "Cash",
  DEMAND_DRAFT: "Demand draft",
  OTHER: "Other",
};
