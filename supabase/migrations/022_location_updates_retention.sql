-- Prune old location history so 1,700 units × 20 min does not grow the DB forever.
-- Schedule daily in Supabase Dashboard → Database → Cron (pg_cron), e.g. 0 3 * * *:

create or replace function public.prune_old_location_updates(p_keep_days integer default 90)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
  v_cutoff timestamptz;
begin
  v_cutoff := now() - (greatest(p_keep_days, 7) || ' days')::interval;

  delete from public.location_updates
  where created_at < v_cutoff;

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.prune_old_location_updates(integer) from public;
grant execute on function public.prune_old_location_updates(integer) to service_role;
