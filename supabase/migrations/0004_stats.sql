-- ===================================================================
-- 0004_stats: read-only aggregates for the admin dashboard
--
-- These exist so the dashboard is one round trip instead of ~30 count
-- queries. Everything here is SECURITY DEFINER and reachable only by the
-- service role: the Next.js server calls them after requireAdmin(), so
-- there is no reason for anon or authenticated to hold EXECUTE.
-- ===================================================================

-- -------------------------------------------------------------------
-- Which statuses mean "this lead was accepted"?
--
-- A lead that has moved on to documents or payment was accepted earlier;
-- only the current status is stored, so acceptance is derived from the
-- position in the pipeline rather than looked up.
-- -------------------------------------------------------------------

create or replace function lead_is_accepted(s lead_status)
returns boolean
language sql
immutable
as $$
  select s = any (array[
    'ACCEPTED', 'APPLICATION_LINK_SENT', 'APPLICATION_IN_PROGRESS',
    'APPLICATION_SUBMITTED', 'APPLICATION_UNDER_REVIEW',
    'DOCUMENTS_PENDING', 'DOCUMENTS_PARTIALLY_SUBMITTED',
    'DOCUMENTS_UNDER_REVIEW', 'DOCUMENT_CORRECTION_REQUIRED',
    'DOCUMENTS_APPROVED', 'FRANCHISE_APPROVED',
    'AGREEMENT_PENDING', 'AGREEMENT_SENT', 'AGREEMENT_COMPLETED',
    'PAYMENT_PENDING', 'PAYMENT_PROOF_SUBMITTED', 'PAYMENT_REJECTED',
    'PAYMENT_APPROVED', 'READY_FOR_ACTIVATION', 'ACTIVE',
    'TRAINING_PENDING', 'TRAINING_SCHEDULED', 'TRAINING_IN_PROGRESS',
    'TRAINING_COMPLETED', 'SETUP_PENDING', 'SETUP_IN_PROGRESS',
    'SETUP_COMPLETED', 'READY_TO_GO_LIVE', 'LIVE', 'ONGOING_SUPPORT'
  ]::lead_status[]);
$$;

-- A lead counts as "contacted" once it leaves the untouched states.
create or replace function lead_is_contacted(s lead_status)
returns boolean
language sql
immutable
as $$
  select s <> all (array['NEW', 'ASSIGNED']::lead_status[]);
$$;

-- -------------------------------------------------------------------
-- member_performance — one row per staff profile (spec §22)
-- -------------------------------------------------------------------

create or replace view member_performance as
select
  p.id                as member_id,
  p.full_name,
  p.email,
  p.status            as member_status,
  p.role              as member_role,
  count(l.id)                                                     as assigned_leads,
  count(l.id) filter (where lead_is_contacted(l.current_status))   as contacted_leads,
  count(l.id) filter (where lead_is_accepted(l.current_status))    as accepted_leads,
  count(l.id) filter (where l.current_status = 'REJECTED')         as rejected_leads,
  coalesce((
    select count(*) from followups f
    where f.member_id = p.id and f.status = 'COMPLETED'
  ), 0)                                                           as followups_completed,
  coalesce((
    select count(distinct t.lead_id)
    from application_tokens t
    join leads tl on tl.id = t.lead_id
    where tl.assigned_member_id = p.id and t.purpose = 'APPLICATION'
  ), 0)                                                           as applications_sent,
  coalesce((
    select count(*)
    from documents d
    join applications a on a.id = d.application_id
    join leads dl on dl.id = a.lead_id
    where dl.assigned_member_id = p.id
  ), 0)                                                           as documents_collected,
  coalesce((
    select count(*)
    from payments pay
    join leads pl on pl.id = pay.lead_id
    where pl.assigned_member_id = p.id
      and pay.proof_storage_path is not null
  ), 0)                                                           as payment_proofs_submitted,
  coalesce((
    select count(*)
    from franchises fr
    join leads fl on fl.id = fr.lead_id
    where fl.assigned_member_id = p.id and fr.status = 'LIVE'
  ), 0)                                                           as live_conversions
from profiles p
left join leads l on l.assigned_member_id = p.id
group by p.id, p.full_name, p.email, p.status, p.role;

-- -------------------------------------------------------------------
-- admin_dashboard_stats — every card and chart in one payload
-- -------------------------------------------------------------------

create or replace function admin_dashboard_stats()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'cards', jsonb_build_object(
      'total_leads',        (select count(*) from leads),
      'new_leads',          (select count(*) from leads where current_status = 'NEW'),
      'assigned_leads',     (select count(*) from leads where assigned_member_id is not null),
      'followups_due',      (select count(*) from followups
                             where status = 'PENDING' and due_at <= now()),
      'accepted_leads',     (select count(*) from leads where lead_is_accepted(current_status)),
      'rejected_leads',     (select count(*) from leads where current_status = 'REJECTED'),
      'applications_submitted',
                            (select count(*) from applications
                             where status in ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED')),
      'documents_pending_review',
                            (select count(*) from documents
                             where status in ('UPLOADED', 'UNDER_REVIEW')),
      'payments_pending_approval',
                            (select count(*) from payments where status = 'PROOF_SUBMITTED'),
      'agreements_pending', (select count(*) from agreements where status <> 'COMPLETED'),
      'active_franchises',  (select count(*) from franchises where status <> 'SUSPENDED'),
      'live_franchises',    (select count(*) from franchises where status = 'LIVE')
    ),

    'leads_by_status', coalesce((
      select jsonb_agg(jsonb_build_object('key', current_status, 'value', c) order by c desc)
      from (select current_status, count(*) c from leads group by current_status) s
    ), '[]'::jsonb),

    'leads_by_source', coalesce((
      select jsonb_agg(jsonb_build_object('key', source, 'value', c) order by c desc)
      from (select source, count(*) c from leads group by source) s
    ), '[]'::jsonb),

    'leads_by_member', coalesce((
      select jsonb_agg(jsonb_build_object('key', full_name, 'value', assigned_leads)
                       order by assigned_leads desc)
      from member_performance
      where member_role = 'MEMBER' and assigned_leads > 0
    ), '[]'::jsonb),

    'accepted_vs_rejected', jsonb_build_array(
      jsonb_build_object('key', 'Accepted',
        'value', (select count(*) from leads where lead_is_accepted(current_status))),
      jsonb_build_object('key', 'Rejected',
        'value', (select count(*) from leads where current_status = 'REJECTED')),
      jsonb_build_object('key', 'In progress',
        'value', (select count(*) from leads
                  where current_status <> 'REJECTED'
                    and not lead_is_accepted(current_status)))
    ),

    -- Last 12 months including empty ones, so the trend line has no gaps.
    'monthly_lead_trend', coalesce((
      select jsonb_agg(jsonb_build_object(
               'key', to_char(m.month, 'Mon YY'),
               'value', (select count(*) from leads l
                         where date_trunc('month', l.created_at) = m.month)
             ) order by m.month)
      from generate_series(
             date_trunc('month', now()) - interval '11 months',
             date_trunc('month', now()),
             interval '1 month'
           ) as m(month)
    ), '[]'::jsonb),

    'franchise_pipeline', coalesce((
      select jsonb_agg(jsonb_build_object('key', status, 'value', c) order by c desc)
      from (select status, count(*) c from franchises group by status) s
    ), '[]'::jsonb),

    'payment_status', coalesce((
      select jsonb_agg(jsonb_build_object('key', status, 'value', c) order by c desc)
      from (select status, count(*) c from payments group by status) s
    ), '[]'::jsonb),

    'franchises_by_territory', coalesce((
      select jsonb_agg(jsonb_build_object('key', territory, 'value', c) order by c desc)
      from (
        select coalesce(nullif(trim(territory), ''), 'Unassigned') territory, count(*) c
        from franchises
        where status <> 'SUSPENDED'
        group by 1
      ) s
    ), '[]'::jsonb)
  );
$$;

-- -------------------------------------------------------------------
-- Reachable only through the service role. Every caller in the app does
-- its own requireAdmin() first.
-- -------------------------------------------------------------------

revoke all on member_performance from anon, authenticated;
revoke all on function admin_dashboard_stats() from public, anon, authenticated;
grant select on member_performance to service_role;
grant execute on function admin_dashboard_stats() to service_role;
