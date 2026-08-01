-- ===================================================================
-- 0002_rls: helper functions, Row Level Security, round-robin
-- ===================================================================

-- -------------------------------------------------------------------
-- Identity helpers
--
-- SECURITY DEFINER so a MEMBER can resolve their own role without being
-- able to read the profiles table directly. search_path is pinned to stop
-- schema-shadowing attacks.
-- -------------------------------------------------------------------

create or replace function current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from profiles
  where auth_user_id = auth.uid()
    and status = 'ACTIVE'
  limit 1;
$$;

create or replace function current_app_role()
returns app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles
  where auth_user_id = auth.uid()
    and status = 'ACTIVE'
  limit 1;
$$;

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(current_app_role() = 'ADMIN', false);
$$;

create or replace function is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select current_profile_id() is not null;
$$;

-- Does the signed-in member own this lead?
create or replace function owns_lead(target_lead uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from leads
    where id = target_lead
      and assigned_member_id = current_profile_id()
  );
$$;

-- Same question, reached through an application.
create or replace function owns_application(target_application uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from applications a
    join leads l on l.id = a.lead_id
    where a.id = target_application
      and l.assigned_member_id = current_profile_id()
  );
$$;

-- -------------------------------------------------------------------
-- Enable RLS everywhere
-- -------------------------------------------------------------------

alter table profiles            enable row level security;
alter table member_invitations  enable row level security;
alter table leads               enable row level security;
alter table lead_assignments    enable row level security;
alter table lead_activities     enable row level security;
alter table followups           enable row level security;
alter table applications        enable row level security;
alter table application_tokens  enable row level security;
alter table document_requests   enable row level security;
alter table documents           enable row level security;
alter table document_reviews    enable row level security;
alter table agreements          enable row level security;
alter table payments            enable row level security;
alter table franchises          enable row level security;
alter table training_records    enable row level security;
alter table setup_items         enable row level security;
alter table email_templates     enable row level security;
alter table email_logs          enable row level security;
alter table activity_logs       enable row level security;
alter table app_settings        enable row level security;

-- -------------------------------------------------------------------
-- profiles
-- -------------------------------------------------------------------

create policy profiles_self_read on profiles
  for select using (auth_user_id = auth.uid() or is_admin());

create policy profiles_admin_write on profiles
  for all using (is_admin()) with check (is_admin());

-- -------------------------------------------------------------------
-- member_invitations — admin only
-- -------------------------------------------------------------------

create policy invitations_admin_all on member_invitations
  for all using (is_admin()) with check (is_admin());

-- -------------------------------------------------------------------
-- leads — admin sees all, member sees only assigned
-- -------------------------------------------------------------------

create policy leads_read on leads
  for select using (
    is_admin() or assigned_member_id = current_profile_id()
  );

create policy leads_admin_insert on leads
  for insert with check (is_admin());

create policy leads_update on leads
  for update using (
    is_admin() or assigned_member_id = current_profile_id()
  ) with check (
    is_admin() or assigned_member_id = current_profile_id()
  );

create policy leads_admin_delete on leads
  for delete using (is_admin());

-- -------------------------------------------------------------------
-- lead_assignments — admin writes, member reads own
-- -------------------------------------------------------------------

create policy lead_assignments_read on lead_assignments
  for select using (is_admin() or owns_lead(lead_id));

create policy lead_assignments_admin_write on lead_assignments
  for all using (is_admin()) with check (is_admin());

-- -------------------------------------------------------------------
-- lead_activities — member may log against their own leads
-- -------------------------------------------------------------------

create policy lead_activities_read on lead_activities
  for select using (is_admin() or owns_lead(lead_id));

create policy lead_activities_insert on lead_activities
  for insert with check (is_admin() or owns_lead(lead_id));

create policy lead_activities_admin_modify on lead_activities
  for update using (is_admin()) with check (is_admin());

create policy lead_activities_admin_delete on lead_activities
  for delete using (is_admin());

-- -------------------------------------------------------------------
-- followups
-- -------------------------------------------------------------------

create policy followups_read on followups
  for select using (is_admin() or owns_lead(lead_id));

create policy followups_write on followups
  for insert with check (is_admin() or owns_lead(lead_id));

create policy followups_update on followups
  for update using (is_admin() or owns_lead(lead_id))
  with check (is_admin() or owns_lead(lead_id));

create policy followups_admin_delete on followups
  for delete using (is_admin());

-- -------------------------------------------------------------------
-- applications — members read; only admin decides
-- -------------------------------------------------------------------

create policy applications_read on applications
  for select using (is_admin() or owns_lead(lead_id));

create policy applications_admin_write on applications
  for all using (is_admin()) with check (is_admin());

-- -------------------------------------------------------------------
-- application_tokens — members may issue links for their own leads
-- -------------------------------------------------------------------

create policy application_tokens_read on application_tokens
  for select using (is_admin() or owns_lead(lead_id));

create policy application_tokens_insert on application_tokens
  for insert with check (is_admin() or owns_lead(lead_id));

create policy application_tokens_admin_write on application_tokens
  for update using (is_admin()) with check (is_admin());

-- -------------------------------------------------------------------
-- document_requests — member may request; only admin approves
-- -------------------------------------------------------------------

create policy document_requests_read on document_requests
  for select using (is_admin() or owns_application(application_id));

create policy document_requests_insert on document_requests
  for insert with check (is_admin() or owns_application(application_id));

create policy document_requests_admin_update on document_requests
  for update using (is_admin()) with check (is_admin());

create policy document_requests_admin_delete on document_requests
  for delete using (is_admin());

-- -------------------------------------------------------------------
-- documents — member reads status only; approval is admin-only
-- -------------------------------------------------------------------

create policy documents_read on documents
  for select using (is_admin() or owns_application(application_id));

create policy documents_admin_write on documents
  for all using (is_admin()) with check (is_admin());

create policy document_reviews_read on document_reviews
  for select using (is_admin());

create policy document_reviews_admin_write on document_reviews
  for all using (is_admin()) with check (is_admin());

-- -------------------------------------------------------------------
-- agreements — admin only, member may read their lead's agreement
-- -------------------------------------------------------------------

create policy agreements_read on agreements
  for select using (is_admin() or owns_lead(lead_id));

create policy agreements_admin_write on agreements
  for all using (is_admin()) with check (is_admin());

-- -------------------------------------------------------------------
-- payments — member records + uploads proof, admin decides
-- -------------------------------------------------------------------

create policy payments_read on payments
  for select using (is_admin() or owns_lead(lead_id));

create policy payments_insert on payments
  for insert with check (is_admin() or owns_lead(lead_id));

-- A member may edit a payment only while it is still theirs to fix.
create policy payments_member_update on payments
  for update using (
    is_admin()
    or (owns_lead(lead_id) and status in ('PENDING','REJECTED','PROOF_SUBMITTED'))
  ) with check (
    is_admin()
    or (owns_lead(lead_id) and status in ('PENDING','PROOF_SUBMITTED'))
  );

create policy payments_admin_delete on payments
  for delete using (is_admin());

-- -------------------------------------------------------------------
-- franchises / training / setup — admin only, member read-only
-- -------------------------------------------------------------------

create policy franchises_read on franchises
  for select using (is_admin() or owns_lead(lead_id));

create policy franchises_admin_write on franchises
  for all using (is_admin()) with check (is_admin());

create policy training_read on training_records
  for select using (is_active_staff());

create policy training_admin_write on training_records
  for all using (is_admin()) with check (is_admin());

create policy setup_read on setup_items
  for select using (is_active_staff());

create policy setup_admin_write on setup_items
  for all using (is_admin()) with check (is_admin());

-- -------------------------------------------------------------------
-- email templates / logs / audit / settings
-- -------------------------------------------------------------------

create policy email_templates_read on email_templates
  for select using (is_admin());

create policy email_templates_admin_write on email_templates
  for all using (is_admin()) with check (is_admin());

create policy email_logs_read on email_logs
  for select using (is_admin() or owns_lead(lead_id));

create policy email_logs_admin_write on email_logs
  for all using (is_admin()) with check (is_admin());

create policy activity_logs_read on activity_logs
  for select using (is_admin());

create policy activity_logs_admin_write on activity_logs
  for all using (is_admin()) with check (is_admin());

create policy app_settings_read on app_settings
  for select using (is_active_staff());

create policy app_settings_admin_write on app_settings
  for all using (is_admin()) with check (is_admin());

-- ===================================================================
-- Round-robin assignment
--
-- Runs inside a single statement and takes a row lock on app_settings, so
-- two enquiries landing at the same moment cannot read the same cursor.
-- ===================================================================

create or replace function assign_lead_round_robin(target_lead uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  settings      app_settings%rowtype;
  member_ids    uuid[];
  next_index    int;
  chosen_member uuid;
  previous_member uuid;
begin
  -- Serialise concurrent assignment on the single settings row.
  select * into settings from app_settings where id = true for update;

  if not settings.round_robin_enabled then
    return null;
  end if;

  select array_agg(id order by created_at, id)
    into member_ids
  from profiles
  where role = 'MEMBER' and status = 'ACTIVE';

  if member_ids is null or array_length(member_ids, 1) = 0 then
    -- No active member: the lead stays unassigned and visible to the Admin.
    return null;
  end if;

  -- Postgres arrays are 1-based; the stored cursor is 0-based.
  next_index := (settings.last_assigned_position + 1) % array_length(member_ids, 1);
  chosen_member := member_ids[next_index + 1];

  select assigned_member_id into previous_member from leads where id = target_lead;

  update leads
     set assigned_member_id = chosen_member,
         current_status = case when current_status = 'NEW' then 'ASSIGNED' else current_status end
   where id = target_lead;

  update app_settings
     set last_assigned_position = next_index,
         updated_at = now()
   where id = true;

  insert into lead_assignments (lead_id, member_id, previous_member_id, method)
  values (target_lead, chosen_member, previous_member, 'ROUND_ROBIN');

  return chosen_member;
end;
$$;

-- ===================================================================
-- Follow-ups that slipped past their due date become OVERDUE on read.
-- Called by the dashboard queries; cheap because of followups_due_idx.
-- ===================================================================

create or replace function mark_overdue_followups()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  affected int;
begin
  update followups
     set status = 'OVERDUE'
   where status = 'PENDING'
     and due_at < now();
  get diagnostics affected = row_count;
  return affected;
end;
$$;
