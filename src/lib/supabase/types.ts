/**
 * Hand-maintained mirror of supabase/migrations/*.sql.
 *
 * Regenerate with the Supabase CLI once a project exists:
 *   supabase gen types typescript --project-id <ref> > src/lib/supabase/types.ts
 * Until then, keep this in step with the migrations by hand.
 */

import type {
  AgreementStatus,
  ApplicationStatus,
  ContactChannel,
  DiscussionOutcome,
  DocumentStatus,
  DocumentType,
  EmailLogStatus,
  FollowupStatus,
  FranchiseStatus,
  InterestLevel,
  InvitationStatus,
  LeadSource,
  LeadStatus,
  PaymentMode,
  PaymentStatus,
  ProfileStatus,
  Role,
  SetupStatus,
  TrainingStatus,
} from "@/lib/domain/enums";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Timestamps = { created_at: string; updated_at: string };

export type ProfileRow = Timestamps & {
  id: string;
  auth_user_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  /** Google profile photo, refreshed on every sign-in. */
  avatar_url: string | null;
  role: Role;
  status: ProfileStatus;
  created_by: string | null;
};

export type MemberInvitationRow = Timestamps & {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  token: string;
  status: InvitationStatus;
  invited_by: string | null;
  accepted_by: string | null;
  expires_at: string;
  accepted_at: string | null;
};

export type LeadRow = Timestamps & {
  id: string;
  lead_number: string;
  full_name: string;
  phone: string;
  whatsapp: string | null;
  email: string;
  city: string;
  source: LeadSource;
  preferred_territory: string | null;
  investment_range: string | null;
  current_occupation: string | null;
  existing_business: string | null;
  message: string | null;
  assigned_member_id: string | null;
  current_status: LeadStatus;
  business_model_discussed: string | null;
  interest_level: InterestLevel | null;
  rejection_reason: string | null;
  next_followup_at: string | null;
  consent_given: boolean;
  created_by: string | null;
};

export type LeadAssignmentRow = {
  id: string;
  lead_id: string;
  member_id: string | null;
  previous_member_id: string | null;
  assigned_by: string | null;
  method: string;
  note: string | null;
  created_at: string;
};

export type LeadActivityRow = {
  id: string;
  lead_id: string;
  member_id: string | null;
  activity_type: string;
  channel: ContactChannel | null;
  notes: string | null;
  discussion_date: string | null;
  investment_discussed: string | null;
  territory_discussed: string | null;
  interest_level: InterestLevel | null;
  outcome: DiscussionOutcome | null;
  previous_status: LeadStatus | null;
  new_status: LeadStatus | null;
  followup_at: string | null;
  created_at: string;
};

export type FollowupRow = Timestamps & {
  id: string;
  lead_id: string;
  member_id: string | null;
  due_at: string;
  channel: ContactChannel | null;
  note: string | null;
  status: FollowupStatus;
  completed_at: string | null;
  completed_note: string | null;
  created_by: string | null;
};

export type ApplicationRow = Timestamps & {
  id: string;
  lead_id: string;
  application_number: string;
  personal_details: Json;
  address_details: Json;
  business_details: Json;
  franchise_details: Json;
  financial_details: Json;
  declaration: Json;
  status: ApplicationStatus;
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  approved_territory: string | null;
  approved_franchise_model: string | null;
  approved_investment: number | null;
  approval_notes: string | null;
  approval_letter_path: string | null;
};

export type ApplicationTokenRow = {
  id: string;
  lead_id: string;
  application_id: string | null;
  token_hash: string;
  purpose: "APPLICATION" | "DOCUMENTS";
  expires_at: string;
  used_at: string | null;
  revoked_at: string | null;
  document_otp_hash: string | null;
  document_otp_expires_at: string | null;
  document_otp_attempts: number;
  document_otp_sent_at: string | null;
  document_otp_send_count: number;
  document_otp_window_started_at: string | null;
  document_otp_verified_at: string | null;
  created_by: string | null;
  created_at: string;
};

export type DocumentRequestRow = {
  id: string;
  application_id: string;
  document_type: DocumentType;
  is_required: boolean;
  request_note: string | null;
  status: DocumentStatus;
  requested_by: string | null;
  requested_at: string;
  updated_at: string;
};

export type DocumentRow = {
  id: string;
  document_request_id: string;
  application_id: string;
  document_type: DocumentType;
  storage_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  version: number;
  status: DocumentStatus;
  uploaded_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
};

export type DocumentReviewRow = {
  id: string;
  document_id: string;
  reviewer_id: string | null;
  decision: DocumentStatus;
  note: string | null;
  created_at: string;
};

export type AgreementRow = Timestamps & {
  id: string;
  lead_id: string;
  agreement_number: string;
  version: number;
  storage_path: string | null;
  file_name: string | null;
  status: AgreementStatus;
  sent_at: string | null;
  applicant_signed_at: string | null;
  company_signed_at: string | null;
  completed_at: string | null;
  notes: string | null;
  /** Fill-in values for the generated document, keyed by agreement field key. */
  field_values: Json;
  /** Per-agreement clause rewrites, keyed by clause id. */
  clause_overrides: Json;
  document_version: string | null;
  document_sent_at: string | null;
  franchisor_signature_path: string | null;
  franchisor_signature_file_name: string | null;
  created_by: string | null;
};

export type PaymentRow = Timestamps & {
  id: string;
  lead_id: string;
  amount: number;
  payment_mode: PaymentMode;
  reference_number: string | null;
  payment_date: string | null;
  proof_storage_path: string | null;
  proof_file_name: string | null;
  status: PaymentStatus;
  submitted_by: string | null;
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
};

export type FranchiseRow = Timestamps & {
  id: string;
  lead_id: string;
  franchise_id: string;
  franchise_name: string;
  owner_name: string;
  phone: string | null;
  email: string | null;
  territory: string | null;
  crm_login_email: string | null;
  dashboard_url: string | null;
  support_owner: string | null;
  support_contact: string | null;
  activation_date: string | null;
  go_live_date: string | null;
  status: FranchiseStatus;
  remarks: string | null;
  activated_by: string | null;
  notes: string | null;
};

export type TrainingRecordRow = Timestamps & {
  id: string;
  franchise_id: string;
  module: string;
  trainer: string | null;
  scheduled_at: string | null;
  venue: string | null;
  attendance: string | null;
  status: TrainingStatus;
  notes: string | null;
  completed_at: string | null;
  document_path: string | null;
  created_by: string | null;
};

export type SetupItemRow = Timestamps & {
  id: string;
  franchise_id: string;
  label: string;
  is_done: boolean;
  note: string | null;
  completed_by: string | null;
  completed_at: string | null;
  sort_order: number;
};

export type EmailTemplateRow = Timestamps & {
  id: string;
  template_key: string;
  name: string;
  subject: string;
  body_html: string;
  default_subject: string;
  default_body: string;
  variables: string[];
  is_active: boolean;
  updated_by: string | null;
};

export type EmailLogRow = {
  id: string;
  template_key: string | null;
  to_email: string;
  to_name: string | null;
  subject: string;
  body_preview: string | null;
  status: EmailLogStatus;
  provider_id: string | null;
  error_message: string | null;
  attachment_names: string[];
  lead_id: string | null;
  triggered_by: string | null;
  created_at: string;
};

export type ActivityLogRow = {
  id: string;
  actor_id: string | null;
  entity_type: string;
  entity_id: string | null;
  action: string;
  summary: string | null;
  metadata: Json;
  created_at: string;
};

export type AppSettingsRow = {
  id: boolean;
  round_robin_enabled: boolean;
  last_assigned_position: number;
  updated_by: string | null;
  updated_at: string;
};

/** Read-only aggregate view — see supabase/migrations/0004_stats.sql. */
export type MemberPerformanceRow = {
  member_id: string;
  full_name: string;
  email: string;
  member_status: ProfileStatus;
  member_role: Role;
  assigned_leads: number;
  contacted_leads: number;
  accepted_leads: number;
  rejected_leads: number;
  followups_completed: number;
  applications_sent: number;
  documents_collected: number;
  payment_proofs_submitted: number;
  live_conversions: number;
};

/**
 * Insert shapes. A column is optional on insert when Postgres can fill it in:
 * it is generated, it has a DEFAULT, or it is nullable. Everything else stays
 * required so a missing NOT NULL column is a type error rather than a 500.
 */
type GeneratedKey =
  | "id"
  | "created_at"
  | "updated_at"
  | "lead_number"
  | "application_number"
  | "agreement_number"
  | "franchise_id"
  | "requested_at"
  | "uploaded_at";

type DefaultedKey =
  | "status"
  | "current_status"
  | "source"
  | "role"
  | "consent_given"
  | "is_required"
  | "is_done"
  | "is_active"
  | "version"
  | "sort_order"
  | "variables"
  | "metadata"
  | "method"
  | "purpose"
  | "expires_at"
  | "document_otp_attempts"
  | "document_otp_send_count"
  | "round_robin_enabled"
  | "last_assigned_position"
  | "personal_details"
  | "address_details"
  | "business_details"
  | "franchise_details"
  | "financial_details"
  | "declaration";

type NullableKey<Row> = {
  [K in keyof Row]-?: null extends Row[K] ? K : never;
}[keyof Row];

type OptionalOnInsert<Row> = Extract<keyof Row, GeneratedKey | DefaultedKey> | NullableKey<Row>;

type TableDef<Row> = {
  Row: Row;
  Insert: Omit<Row, OptionalOnInsert<Row>> &
    Partial<Pick<Row, Extract<OptionalOnInsert<Row>, keyof Row>>>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDef<ProfileRow>;
      member_invitations: TableDef<MemberInvitationRow>;
      leads: TableDef<LeadRow>;
      lead_assignments: TableDef<LeadAssignmentRow>;
      lead_activities: TableDef<LeadActivityRow>;
      followups: TableDef<FollowupRow>;
      applications: TableDef<ApplicationRow>;
      application_tokens: TableDef<ApplicationTokenRow>;
      document_requests: TableDef<DocumentRequestRow>;
      documents: TableDef<DocumentRow>;
      document_reviews: TableDef<DocumentReviewRow>;
      agreements: TableDef<AgreementRow>;
      payments: TableDef<PaymentRow>;
      franchises: TableDef<FranchiseRow>;
      training_records: TableDef<TrainingRecordRow>;
      setup_items: TableDef<SetupItemRow>;
      email_templates: TableDef<EmailTemplateRow>;
      email_logs: TableDef<EmailLogRow>;
      activity_logs: TableDef<ActivityLogRow>;
      app_settings: TableDef<AppSettingsRow>;
    };
    Views: {
      member_performance: {
        Row: MemberPerformanceRow;
        Relationships: [];
      };
    };
    Functions: {
      assign_lead_round_robin: {
        Args: { target_lead: string };
        Returns: string | null;
      };
      mark_overdue_followups: { Args: Record<never, never>; Returns: number };
      current_profile_id: { Args: Record<never, never>; Returns: string | null };
      is_admin: { Args: Record<never, never>; Returns: boolean };
      admin_dashboard_stats: { Args: Record<never, never>; Returns: Json };
      admin_delete_lead_cascade: {
        Args: { target_lead: string };
        Returns: Json;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

export type SetupStatusType = SetupStatus;
