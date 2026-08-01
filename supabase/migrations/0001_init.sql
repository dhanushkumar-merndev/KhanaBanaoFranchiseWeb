-- ===================================================================
-- KHANA BANAO — franchise partner management
-- 0001_init: enums, tables, sequences, indexes
-- ===================================================================

create extension if not exists "pgcrypto";

-- -------------------------------------------------------------------
-- Enums
-- -------------------------------------------------------------------

create type app_role            as enum ('ADMIN','MEMBER');
create type profile_status      as enum ('ACTIVE','INACTIVE');
create type invitation_status   as enum ('PENDING','ACCEPTED','EXPIRED','REVOKED');

create type lead_source as enum (
  'WEBSITE','WHATSAPP','PHONE','REFERRAL','WALK_IN','EMAIL',
  'FACEBOOK','INSTAGRAM','OTHER'
);

create type lead_status as enum (
  'NEW','ASSIGNED','CONTACTED','BUSINESS_DISCUSSION','FOLLOW_UP',
  'ACCEPTED','REJECTED',
  'APPLICATION_LINK_SENT','APPLICATION_IN_PROGRESS','APPLICATION_SUBMITTED',
  'APPLICATION_UNDER_REVIEW',
  'DOCUMENTS_PENDING','DOCUMENTS_PARTIALLY_SUBMITTED','DOCUMENTS_UNDER_REVIEW',
  'DOCUMENT_CORRECTION_REQUIRED','DOCUMENTS_APPROVED',
  'FRANCHISE_APPROVED',
  'AGREEMENT_PENDING','AGREEMENT_SENT','AGREEMENT_COMPLETED',
  'PAYMENT_PENDING','PAYMENT_PROOF_SUBMITTED','PAYMENT_REJECTED','PAYMENT_APPROVED',
  'READY_FOR_ACTIVATION','ACTIVE',
  'TRAINING_PENDING','TRAINING_SCHEDULED','TRAINING_IN_PROGRESS','TRAINING_COMPLETED',
  'SETUP_PENDING','SETUP_IN_PROGRESS','SETUP_COMPLETED',
  'READY_TO_GO_LIVE','LIVE','ONGOING_SUPPORT'
);

create type contact_channel     as enum ('PHONE','WHATSAPP','EMAIL','VIDEO_MEETING','OFFICE_MEETING','OTHER');
create type discussion_outcome  as enum ('ACCEPTED','FOLLOW_UP_REQUIRED','REJECTED','UNREACHABLE');
create type interest_level      as enum ('HIGH','MEDIUM','LOW');
create type followup_status     as enum ('PENDING','COMPLETED','OVERDUE','CANCELLED','RESCHEDULED');
create type application_status  as enum ('IN_PROGRESS','SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED');

create type document_type as enum (
  'AADHAAR_CARD','PAN_CARD','PASSPORT_PHOTO','ADDRESS_PROOF','CANCELLED_CHEQUE',
  'GST_CERTIFICATE','BUSINESS_REGISTRATION','PREMISES_PHOTOGRAPHS','BANK_STATEMENT','OTHER'
);

create type document_status  as enum ('REQUESTED','UPLOADED','UNDER_REVIEW','APPROVED','REUPLOAD_REQUIRED');
create type agreement_status as enum ('PENDING','UPLOADED','SENT','SIGNED_BY_APPLICANT','SIGNED_BY_COMPANY','COMPLETED');
create type payment_mode     as enum ('BANK_TRANSFER','UPI','CHEQUE','CASH','DEMAND_DRAFT','OTHER');
create type payment_status   as enum ('PENDING','PROOF_SUBMITTED','APPROVED','REJECTED');
create type franchise_status as enum ('ACTIVE','TRAINING','SETUP','READY_TO_GO_LIVE','LIVE','ONGOING_SUPPORT','SUSPENDED');
create type training_status  as enum ('TRAINING_PENDING','TRAINING_SCHEDULED','TRAINING_IN_PROGRESS','TRAINING_COMPLETED');
create type setup_status     as enum ('SETUP_PENDING','SETUP_IN_PROGRESS','SETUP_COMPLETED');
create type email_log_status as enum ('SENT','FAILED','SKIPPED');

-- -------------------------------------------------------------------
-- Shared trigger: keep updated_at honest
-- -------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -------------------------------------------------------------------
-- profiles
-- -------------------------------------------------------------------

create table profiles (
  id           uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  full_name    text not null,
  email        text not null unique,
  phone        text,
  role         app_role not null default 'MEMBER',
  status       profile_status not null default 'ACTIVE',
  created_by   uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index profiles_role_status_idx on profiles(role, status);
create index profiles_email_idx on profiles(lower(email));

create trigger profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- Hard cap on active members (spec §5). Admins are not counted.
create or replace function enforce_member_limit()
returns trigger
language plpgsql
as $$
declare
  active_count int;
begin
  if new.role = 'MEMBER' and new.status = 'ACTIVE' then
    select count(*) into active_count
    from profiles
    where role = 'MEMBER'
      and status = 'ACTIVE'
      and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

    if active_count >= 20 then
      raise exception 'Maximum of 20 active members reached. Deactivate a member first.'
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_member_limit
  before insert or update of role, status on profiles
  for each row execute function enforce_member_limit();

-- -------------------------------------------------------------------
-- member_invitations
-- -------------------------------------------------------------------

create table member_invitations (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null,
  email       text not null,
  phone       text,
  token       text not null unique,
  status      invitation_status not null default 'PENDING',
  invited_by  uuid references profiles(id) on delete set null,
  accepted_by uuid references profiles(id) on delete set null,
  expires_at  timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index member_invitations_pending_email_idx
  on member_invitations(lower(email))
  where status = 'PENDING';

create trigger member_invitations_updated_at
  before update on member_invitations
  for each row execute function set_updated_at();

-- -------------------------------------------------------------------
-- leads
-- -------------------------------------------------------------------

create sequence lead_number_seq start 1001;

create table leads (
  id                       uuid primary key default gen_random_uuid(),
  lead_number              text not null unique
                             default ('KB-L' || lpad(nextval('lead_number_seq')::text, 5, '0')),
  full_name                text not null,
  phone                    text not null,
  whatsapp                 text,
  email                    text not null,
  city                     text not null,
  source                   lead_source not null default 'WEBSITE',
  preferred_territory      text,
  investment_range         text,
  current_occupation       text,
  existing_business        text,
  message                  text,
  assigned_member_id       uuid references profiles(id) on delete set null,
  current_status           lead_status not null default 'NEW',
  business_model_discussed text,
  interest_level           interest_level,
  rejection_reason         text,
  next_followup_at         timestamptz,
  consent_given            boolean not null default false,
  created_by               uuid references profiles(id) on delete set null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index leads_assigned_member_idx on leads(assigned_member_id);
create index leads_status_idx on leads(current_status);
create index leads_created_at_idx on leads(created_at desc);
create index leads_next_followup_idx on leads(next_followup_at) where next_followup_at is not null;
create index leads_search_idx on leads
  using gin (to_tsvector('simple', full_name || ' ' || phone || ' ' || email || ' ' || lead_number));

create trigger leads_updated_at
  before update on leads
  for each row execute function set_updated_at();

-- -------------------------------------------------------------------
-- lead_assignments — full history of who owned a lead and why
-- -------------------------------------------------------------------

create table lead_assignments (
  id             uuid primary key default gen_random_uuid(),
  lead_id        uuid not null references leads(id) on delete cascade,
  member_id      uuid references profiles(id) on delete set null,
  previous_member_id uuid references profiles(id) on delete set null,
  assigned_by    uuid references profiles(id) on delete set null,
  method         text not null default 'ROUND_ROBIN', -- ROUND_ROBIN | MANUAL
  note           text,
  created_at     timestamptz not null default now()
);

create index lead_assignments_lead_idx on lead_assignments(lead_id, created_at desc);

-- -------------------------------------------------------------------
-- lead_activities — calls, WhatsApp, meetings, status changes
-- -------------------------------------------------------------------

create table lead_activities (
  id              uuid primary key default gen_random_uuid(),
  lead_id         uuid not null references leads(id) on delete cascade,
  member_id       uuid references profiles(id) on delete set null,
  activity_type   text not null,
  channel         contact_channel,
  notes           text,
  discussion_date timestamptz,
  investment_discussed text,
  territory_discussed  text,
  interest_level  interest_level,
  outcome         discussion_outcome,
  previous_status lead_status,
  new_status      lead_status,
  followup_at     timestamptz,
  created_at      timestamptz not null default now()
);

create index lead_activities_lead_idx on lead_activities(lead_id, created_at desc);

-- -------------------------------------------------------------------
-- followups
-- -------------------------------------------------------------------

create table followups (
  id           uuid primary key default gen_random_uuid(),
  lead_id      uuid not null references leads(id) on delete cascade,
  member_id    uuid references profiles(id) on delete set null,
  due_at       timestamptz not null,
  channel      contact_channel,
  note         text,
  status       followup_status not null default 'PENDING',
  completed_at timestamptz,
  completed_note text,
  created_by   uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index followups_due_idx on followups(due_at) where status = 'PENDING';
create index followups_member_idx on followups(member_id, status);
create index followups_lead_idx on followups(lead_id);

create trigger followups_updated_at
  before update on followups
  for each row execute function set_updated_at();

-- -------------------------------------------------------------------
-- applications
-- -------------------------------------------------------------------

create sequence application_number_seq start 1001;

create table applications (
  id                 uuid primary key default gen_random_uuid(),
  lead_id            uuid not null unique references leads(id) on delete cascade,
  application_number text not null unique
                       default ('KB-A' || lpad(nextval('application_number_seq')::text, 5, '0')),
  personal_details   jsonb not null default '{}'::jsonb,
  address_details    jsonb not null default '{}'::jsonb,
  business_details   jsonb not null default '{}'::jsonb,
  franchise_details  jsonb not null default '{}'::jsonb,
  financial_details  jsonb not null default '{}'::jsonb,
  declaration        jsonb not null default '{}'::jsonb,
  status             application_status not null default 'IN_PROGRESS',
  submitted_at       timestamptz,
  reviewed_by        uuid references profiles(id) on delete set null,
  reviewed_at        timestamptz,
  review_notes       text,
  -- Franchise approval record (spec §16)
  approved_territory       text,
  approved_franchise_model text,
  approved_investment      numeric(12,2),
  approval_notes           text,
  approval_letter_path     text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index applications_status_idx on applications(status);

create trigger applications_updated_at
  before update on applications
  for each row execute function set_updated_at();

-- -------------------------------------------------------------------
-- application_tokens / document upload tokens
-- -------------------------------------------------------------------

create table application_tokens (
  id             uuid primary key default gen_random_uuid(),
  lead_id        uuid not null references leads(id) on delete cascade,
  application_id uuid references applications(id) on delete cascade,
  token_hash     text not null unique,
  purpose        text not null default 'APPLICATION', -- APPLICATION | DOCUMENTS
  expires_at     timestamptz not null default (now() + interval '30 days'),
  used_at        timestamptz,
  revoked_at     timestamptz,
  created_by     uuid references profiles(id) on delete set null,
  created_at     timestamptz not null default now()
);

create index application_tokens_lead_idx on application_tokens(lead_id, purpose);

-- -------------------------------------------------------------------
-- document_requests + documents + document_reviews
-- -------------------------------------------------------------------

create table document_requests (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  document_type  document_type not null,
  is_required    boolean not null default true,
  request_note   text,
  status         document_status not null default 'REQUESTED',
  requested_by   uuid references profiles(id) on delete set null,
  requested_at   timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (application_id, document_type)
);

create index document_requests_application_idx on document_requests(application_id);

create trigger document_requests_updated_at
  before update on document_requests
  for each row execute function set_updated_at();

create table documents (
  id                  uuid primary key default gen_random_uuid(),
  document_request_id uuid not null references document_requests(id) on delete cascade,
  application_id      uuid not null references applications(id) on delete cascade,
  document_type       document_type not null,
  storage_path        text not null,
  file_name           text not null,
  file_size           bigint not null,
  mime_type           text not null,
  version             int not null default 1,
  status              document_status not null default 'UPLOADED',
  uploaded_at         timestamptz not null default now(),
  reviewed_by         uuid references profiles(id) on delete set null,
  reviewed_at         timestamptz,
  rejection_reason    text
);

create index documents_request_idx on documents(document_request_id, version desc);
create index documents_application_idx on documents(application_id);
create index documents_status_idx on documents(status);

create table document_reviews (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  reviewer_id uuid references profiles(id) on delete set null,
  decision    document_status not null,
  note        text,
  created_at  timestamptz not null default now()
);

create index document_reviews_document_idx on document_reviews(document_id, created_at desc);

-- -------------------------------------------------------------------
-- agreements
-- -------------------------------------------------------------------

create sequence agreement_number_seq start 1001;

create table agreements (
  id                  uuid primary key default gen_random_uuid(),
  lead_id             uuid not null references leads(id) on delete cascade,
  agreement_number    text not null unique
                        default ('KB-AG' || lpad(nextval('agreement_number_seq')::text, 5, '0')),
  version             int not null default 1,
  storage_path        text,
  file_name           text,
  status              agreement_status not null default 'PENDING',
  sent_at             timestamptz,
  applicant_signed_at timestamptz,
  company_signed_at   timestamptz,
  completed_at        timestamptz,
  notes               text,
  created_by          uuid references profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index agreements_lead_idx on agreements(lead_id, version desc);
create index agreements_status_idx on agreements(status);

create trigger agreements_updated_at
  before update on agreements
  for each row execute function set_updated_at();

-- -------------------------------------------------------------------
-- payments
-- -------------------------------------------------------------------

create table payments (
  id                 uuid primary key default gen_random_uuid(),
  lead_id            uuid not null references leads(id) on delete cascade,
  amount             numeric(12,2) not null check (amount > 0),
  payment_mode       payment_mode not null,
  reference_number   text,
  payment_date       date,
  proof_storage_path text,
  proof_file_name    text,
  status             payment_status not null default 'PENDING',
  submitted_by       uuid references profiles(id) on delete set null,
  submitted_at       timestamptz,
  reviewed_by        uuid references profiles(id) on delete set null,
  reviewed_at        timestamptz,
  rejection_reason   text,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index payments_lead_idx on payments(lead_id, created_at desc);
create index payments_status_idx on payments(status);

create trigger payments_updated_at
  before update on payments
  for each row execute function set_updated_at();

-- -------------------------------------------------------------------
-- franchises
-- -------------------------------------------------------------------

create sequence franchise_number_seq start 101;

create table franchises (
  id              uuid primary key default gen_random_uuid(),
  lead_id         uuid not null unique references leads(id) on delete cascade,
  franchise_id    text not null unique
                    default ('KB-F' || lpad(nextval('franchise_number_seq')::text, 4, '0')),
  franchise_name  text not null,
  owner_name      text not null,
  phone           text,
  email           text,
  territory       text,
  crm_login_email text,
  dashboard_url   text,
  support_owner   uuid references profiles(id) on delete set null,
  support_contact text,
  activation_date date,
  go_live_date    date,
  status          franchise_status not null default 'ACTIVE',
  remarks         text,
  activated_by    uuid references profiles(id) on delete set null,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index franchises_status_idx on franchises(status);
create index franchises_territory_idx on franchises(territory);

create trigger franchises_updated_at
  before update on franchises
  for each row execute function set_updated_at();

-- -------------------------------------------------------------------
-- training_records + setup_items
-- -------------------------------------------------------------------

create table training_records (
  id             uuid primary key default gen_random_uuid(),
  franchise_id   uuid not null references franchises(id) on delete cascade,
  module         text not null,
  trainer        text,
  scheduled_at   timestamptz,
  venue          text,
  attendance     text,
  status         training_status not null default 'TRAINING_PENDING',
  notes          text,
  completed_at   timestamptz,
  document_path  text,
  created_by     uuid references profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index training_records_franchise_idx on training_records(franchise_id);

create trigger training_records_updated_at
  before update on training_records
  for each row execute function set_updated_at();

create table setup_items (
  id           uuid primary key default gen_random_uuid(),
  franchise_id uuid not null references franchises(id) on delete cascade,
  label        text not null,
  is_done      boolean not null default false,
  note         text,
  completed_by uuid references profiles(id) on delete set null,
  completed_at timestamptz,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (franchise_id, label)
);

create index setup_items_franchise_idx on setup_items(franchise_id, sort_order);

create trigger setup_items_updated_at
  before update on setup_items
  for each row execute function set_updated_at();

-- -------------------------------------------------------------------
-- email_templates + email_logs
-- -------------------------------------------------------------------

create table email_templates (
  id              uuid primary key default gen_random_uuid(),
  template_key    text not null unique,
  name            text not null,
  subject         text not null,
  body_html       text not null,
  default_subject text not null,
  default_body    text not null,
  variables       text[] not null default '{}',
  is_active       boolean not null default true,
  updated_by      uuid references profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger email_templates_updated_at
  before update on email_templates
  for each row execute function set_updated_at();

create table email_logs (
  id            uuid primary key default gen_random_uuid(),
  template_key  text,
  to_email      text not null,
  to_name       text,
  subject       text not null,
  body_preview  text,
  status        email_log_status not null,
  provider_id   text,
  error_message text,
  lead_id       uuid references leads(id) on delete set null,
  triggered_by  uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index email_logs_created_idx on email_logs(created_at desc);
create index email_logs_lead_idx on email_logs(lead_id);
create index email_logs_status_idx on email_logs(status);

-- -------------------------------------------------------------------
-- activity_logs — cross-entity audit trail
-- -------------------------------------------------------------------

create table activity_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references profiles(id) on delete set null,
  entity_type text not null,
  entity_id   uuid,
  action      text not null,
  summary     text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index activity_logs_entity_idx on activity_logs(entity_type, entity_id, created_at desc);
create index activity_logs_created_idx on activity_logs(created_at desc);

-- -------------------------------------------------------------------
-- app_settings + round-robin cursor
-- -------------------------------------------------------------------

create table app_settings (
  id                    boolean primary key default true check (id),
  round_robin_enabled   boolean not null default true,
  last_assigned_position int not null default -1,
  updated_by            uuid references profiles(id) on delete set null,
  updated_at            timestamptz not null default now()
);

insert into app_settings (id) values (true) on conflict do nothing;
