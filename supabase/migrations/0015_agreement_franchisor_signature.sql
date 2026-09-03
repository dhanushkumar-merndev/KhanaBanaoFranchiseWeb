-- Private company-signature image embedded into the generated agreement PDF.
-- The object itself lives in the existing private agreements storage bucket;
-- only its path and original display name are stored on the agreement row.

alter table agreements
  add column if not exists franchisor_signature_path text,
  add column if not exists franchisor_signature_file_name text;

comment on column agreements.franchisor_signature_path is
  'Private agreements-bucket path for the authorised Khana Banao signature image.';
comment on column agreements.franchisor_signature_file_name is
  'Original file name shown in the agreement editor.';

-- Keep permanent lead deletion complete: signature images share the private
-- agreements bucket but are separate from uploaded signed-agreement PDFs.
create or replace function public.admin_delete_lead_cascade(target_lead uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  storage_paths jsonb;
begin
  perform 1 from public.leads where id = target_lead for update;
  if not found then raise exception 'Lead not found'; end if;

  select jsonb_build_object(
    'documents', coalesce((
      select jsonb_agg(d.storage_path) from public.documents d
      join public.applications a on a.id = d.application_id
      where a.lead_id = target_lead and d.storage_path is not null
    ), '[]'::jsonb),
    'agreements', coalesce((
      select jsonb_agg(path) from (
        select a.storage_path as path from public.agreements a
        where a.lead_id = target_lead and a.storage_path is not null
        union all
        select a.franchisor_signature_path as path from public.agreements a
        where a.lead_id = target_lead and a.franchisor_signature_path is not null
      ) agreement_files
    ), '[]'::jsonb),
    'paymentProofs', coalesce((
      select jsonb_agg(p.proof_storage_path) from public.payments p
      where p.lead_id = target_lead and p.proof_storage_path is not null
    ), '[]'::jsonb),
    'approvalLetters', coalesce((
      select jsonb_agg(a.approval_letter_path) from public.applications a
      where a.lead_id = target_lead and a.approval_letter_path is not null
    ), '[]'::jsonb),
    'training', coalesce((
      select jsonb_agg(t.document_path) from public.training_records t
      join public.franchises f on f.id = t.franchise_id
      where f.lead_id = target_lead and t.document_path is not null
    ), '[]'::jsonb)
  ) into storage_paths;

  delete from public.email_logs where lead_id = target_lead;
  delete from public.activity_logs
  where metadata ->> 'lead_id' = target_lead::text
     or entity_id in (
       select target_lead
       union all select id from public.lead_assignments where lead_id = target_lead
       union all select id from public.lead_activities where lead_id = target_lead
       union all select id from public.followups where lead_id = target_lead
       union all select id from public.applications where lead_id = target_lead
       union all select id from public.application_tokens where lead_id = target_lead
       union all select dr.id from public.document_requests dr
         join public.applications a on a.id = dr.application_id where a.lead_id = target_lead
       union all select d.id from public.documents d
         join public.applications a on a.id = d.application_id where a.lead_id = target_lead
       union all select rv.id from public.document_reviews rv
         join public.documents d on d.id = rv.document_id
         join public.applications a on a.id = d.application_id where a.lead_id = target_lead
       union all select id from public.agreements where lead_id = target_lead
       union all select id from public.payments where lead_id = target_lead
       union all select id from public.franchises where lead_id = target_lead
       union all select t.id from public.training_records t
         join public.franchises f on f.id = t.franchise_id where f.lead_id = target_lead
       union all select s.id from public.setup_items s
         join public.franchises f on f.id = s.franchise_id where f.lead_id = target_lead
     );

  delete from public.leads where id = target_lead;
  return storage_paths;
end;
$$;

revoke all on function public.admin_delete_lead_cascade(uuid)
  from public, anon, authenticated;
grant execute on function public.admin_delete_lead_cascade(uuid) to service_role;
