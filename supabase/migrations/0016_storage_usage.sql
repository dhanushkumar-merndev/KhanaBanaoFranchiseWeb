-- Read-only usage figures for the admin Storage page: how big the database
-- is, which tables account for it, and how many bytes sit in each Storage
-- bucket. Nothing here is exposed to anon/authenticated — the admin page
-- reads it through the service-role client after its own requireAdmin()
-- check, same pattern as admin_delete_lead_cascade.

create or replace function public.admin_database_size()
returns bigint
language sql
security definer
set search_path = pg_catalog, pg_temp
as $$
  select pg_database_size(current_database());
$$;

create or replace function public.admin_table_sizes()
returns table (table_name text, total_bytes bigint, row_estimate bigint)
language sql
security definer
set search_path = pg_catalog, pg_temp
as $$
  select
    c.relname::text as table_name,
    pg_total_relation_size(c.oid) as total_bytes,
    greatest(c.reltuples, 0)::bigint as row_estimate
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
  order by total_bytes desc;
$$;

create or replace function public.admin_object_storage_usage()
returns table (bucket_id text, object_count bigint, total_bytes bigint)
language sql
security definer
set search_path = pg_catalog, pg_temp
as $$
  select
    o.bucket_id,
    count(*)::bigint as object_count,
    coalesce(sum((o.metadata ->> 'size')::bigint), 0) as total_bytes
  from storage.objects o
  group by o.bucket_id;
$$;

revoke all on function public.admin_database_size() from public, anon, authenticated;
revoke all on function public.admin_table_sizes() from public, anon, authenticated;
revoke all on function public.admin_object_storage_usage() from public, anon, authenticated;

grant execute on function public.admin_database_size() to service_role;
grant execute on function public.admin_table_sizes() to service_role;
grant execute on function public.admin_object_storage_usage() to service_role;
