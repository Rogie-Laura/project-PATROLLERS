-- Fix: get_latest_patrol_locations must use the newest row per unit, then drop
-- units whose latest row is stop-tracking. Filtering tracking_active = true
-- before DISTINCT ON wrongly resurrected the previous live row on refresh.

create or replace function public.get_latest_patrol_locations()
returns setof public.location_updates
language sql
stable
security definer
set search_path = public
as $$
  select latest.*
  from (
    select distinct on (access_token_id) *
    from public.location_updates
    where access_token_id is not null
    order by access_token_id, created_at desc
  ) as latest
  where coalesce(latest.tracking_active, true) = true;
$$;

revoke all on function public.get_latest_patrol_locations() from public;
grant execute on function public.get_latest_patrol_locations() to anon, authenticated;
