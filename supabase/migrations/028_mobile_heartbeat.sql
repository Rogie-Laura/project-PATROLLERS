-- P1: Mobile heartbeat — monitor link handshake separate from GPS position.

alter table public.mobile_device_profiles
  add column if not exists last_seen_at timestamptz;

create index if not exists mobile_device_profiles_last_seen_idx
  on public.mobile_device_profiles (last_seen_at desc nulls last);

-- Lightweight ping (~60s) while tracking is on. No GPS required.
create or replace function public.record_mobile_heartbeat(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token_id uuid;
  v_seen timestamptz := now();
begin
  p_token := trim(coalesce(p_token, ''));
  if p_token = '' then
    return jsonb_build_object('ok', false, 'error', 'Missing access token.');
  end if;

  select id into v_token_id
  from public.access_tokens
  where token = p_token and is_active = true;

  if v_token_id is null then
    return jsonb_build_object('ok', false, 'error', 'Invalid or inactive access token.');
  end if;

  insert into public.mobile_device_profiles (access_token_id, last_seen_at, updated_at)
  values (v_token_id, v_seen, v_seen)
  on conflict (access_token_id) do update
  set last_seen_at = v_seen, updated_at = v_seen;

  return jsonb_build_object('ok', true, 'last_seen_at', v_seen);
end;
$$;

revoke all on function public.record_mobile_heartbeat(text) from public;
grant execute on function public.record_mobile_heartbeat(text) to anon, authenticated;

-- Latest GPS per unit plus last_seen_at for monitor presence.
create or replace function public.get_monitor_patrol_snapshot()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(row_data order by row_data->>'created_at' desc nulls last),
    '[]'::jsonb
  )
  from (
    select to_jsonb(lu.*) || jsonb_build_object('last_seen_at', p.last_seen_at) as row_data
    from (
      select distinct on (access_token_id) *
      from public.location_updates
      where access_token_id is not null
      order by access_token_id, created_at desc
    ) as lu
    left join public.mobile_device_profiles p
      on p.access_token_id = lu.access_token_id
    where coalesce(lu.tracking_active, true) = true
  ) as snap;
$$;

revoke all on function public.get_monitor_patrol_snapshot() from public;
grant execute on function public.get_monitor_patrol_snapshot() to anon, authenticated;

alter publication supabase_realtime add table public.mobile_device_profiles;
