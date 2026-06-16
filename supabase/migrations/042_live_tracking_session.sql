-- Grab-style live sharing: pin stays on map while live_tracking_active until explicit Stop.
-- Position = last GPS row with tracking_active=true (not the stop beacon row).

alter table public.mobile_device_profiles
  add column if not exists live_tracking_active boolean not null default false;

-- Backfill units currently on the map (latest row is a live ping).
update public.mobile_device_profiles p
set live_tracking_active = true
from (
  select distinct on (access_token_id) access_token_id, tracking_active
  from public.location_updates
  where access_token_id is not null
  order by access_token_id, created_at desc
) latest
where p.access_token_id = latest.access_token_id
  and coalesce(latest.tracking_active, true) = true;

create or replace function public.set_mobile_live_tracking(
  p_token text,
  p_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token_id uuid;
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

  insert into public.mobile_device_profiles (access_token_id, live_tracking_active, updated_at)
  values (v_token_id, coalesce(p_active, false), now())
  on conflict (access_token_id) do update
  set live_tracking_active = coalesce(p_active, false), updated_at = now();

  return jsonb_build_object(
    'ok', true,
    'live_tracking_active', coalesce(p_active, false)
  );
end;
$$;

revoke all on function public.set_mobile_live_tracking(text, boolean) from public;
grant execute on function public.set_mobile_live_tracking(text, boolean) to anon, authenticated;

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
    select
      to_jsonb(lu.*)
      || jsonb_build_object(
        'last_seen_at', p.last_seen_at,
        'patrol_unit_type', coalesce(p.patrol_unit_type, lu.patrol_unit_type),
        'live_tracking_active', true
      ) as row_data
    from public.mobile_device_profiles p
    inner join lateral (
      select *
      from public.location_updates lu
      where lu.access_token_id = p.access_token_id
        and coalesce(lu.tracking_active, true) = true
      order by lu.created_at desc
      limit 1
    ) lu on true
    where coalesce(p.live_tracking_active, false) = true
  ) as snap;
$$;

create or replace function public.get_latest_patrol_locations()
returns setof public.location_updates
language sql
stable
security definer
set search_path = public
as $$
  select lu.*
  from public.mobile_device_profiles p
  inner join lateral (
    select *
    from public.location_updates lu
    where lu.access_token_id = p.access_token_id
      and coalesce(lu.tracking_active, true) = true
    order by lu.created_at desc
    limit 1
  ) lu on true
  where coalesce(p.live_tracking_active, false) = true;
$$;

-- Live session flag: set via set_mobile_live_tracking; GPS pings may turn it on, never off.
create or replace function public.insert_mobile_location(
  p_token text,
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy double precision default null,
  p_status text default null,
  p_battery_level integer default null,
  p_signal_label text default null,
  p_signal_level text default null,
  p_tracking_active boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_access_token public.access_tokens%rowtype;
  v_profile public.mobile_device_profiles%rowtype;
  v_patrol_name text;
  v_personnel jsonb;
  v_signal_level text;
  v_battery integer;
  v_row public.location_updates%rowtype;
  v_interval integer;
  v_patrol_status text;
  v_tracking boolean := coalesce(p_tracking_active, true);
begin
  p_token := trim(coalesce(p_token, ''));
  if p_token = '' then
    return jsonb_build_object('ok', false, 'error', 'Missing access token.');
  end if;

  if p_latitude is null
    or p_longitude is null
    or p_latitude < -90
    or p_latitude > 90
    or p_longitude < -180
    or p_longitude > 180
  then
    return jsonb_build_object('ok', false, 'error', 'Invalid coordinates.');
  end if;

  select * into v_access_token
  from public.access_tokens
  where token = p_token and is_active = true;

  if not found then
    return jsonb_build_object(
      'ok',
      false,
      'error',
      'Invalid or inactive access token.'
    );
  end if;

  select * into v_profile
  from public.mobile_device_profiles
  where access_token_id = v_access_token.id;

  v_patrol_name := coalesce(
    nullif(trim(v_profile.mobile_plate), ''),
    nullif(trim(v_profile.radio_call_sign), ''),
    nullif(trim(v_profile.unit), ''),
    'Mobile Patrol'
  );

  v_personnel := coalesce(v_profile.personnel_on_board, '[]'::jsonb);

  v_signal_level := null;
  if lower(trim(coalesce(p_signal_level, ''))) in ('strong', 'weak', 'none') then
    v_signal_level := lower(trim(p_signal_level));
  end if;

  if p_battery_level is not null then
    v_battery := greatest(0, least(100, round(p_battery_level)::integer));
  end if;

  v_patrol_status := nullif(trim(coalesce(p_status, '')), '');

  insert into public.location_updates (
    access_token_id,
    latitude,
    longitude,
    accuracy,
    patrol_name,
    badge_number,
    mobile_plate,
    mobile_phone,
    radio_call_sign,
    office,
    unit,
    personnel_on_board,
    patrol_status,
    patrol_unit_type,
    battery_level,
    signal_label,
    signal_level,
    tracking_active
  )
  values (
    v_access_token.id,
    p_latitude,
    p_longitude,
    p_accuracy,
    v_patrol_name,
    coalesce(nullif(trim(v_profile.mobile_plate), ''), v_access_token.label, 'MOBILE'),
    nullif(trim(v_profile.mobile_plate), ''),
    nullif(trim(v_profile.mobile_phone), ''),
    nullif(trim(v_profile.radio_call_sign), ''),
    nullif(trim(v_profile.office), ''),
    nullif(trim(v_profile.unit), ''),
    v_personnel,
    v_patrol_status,
    nullif(trim(coalesce(v_profile.patrol_unit_type, '')), ''),
    v_battery,
    nullif(trim(coalesce(p_signal_label, '')), ''),
    v_signal_level,
    v_tracking
  )
  returning * into v_row;

  -- Live session ends only via set_mobile_live_tracking(false), not GPS stop beacons.
  if v_tracking then
    insert into public.mobile_device_profiles (access_token_id, live_tracking_active, updated_at)
    values (v_access_token.id, true, now())
    on conflict (access_token_id) do update
    set
      live_tracking_active = true,
      patrol_status = coalesce(v_patrol_status, mobile_device_profiles.patrol_status),
      updated_at = now();
  elsif v_patrol_status is not null then
    update public.mobile_device_profiles
    set patrol_status = v_patrol_status, updated_at = now()
    where access_token_id = v_access_token.id;
  end if;

  select location_interval_seconds
  into v_interval
  from public.system_settings
  where id = 'default';

  v_interval := coalesce(v_interval, 180);
  v_interval := greatest(30, least(86400, v_interval));

  return jsonb_build_object(
    'ok',
    true,
    'interval_seconds',
    v_interval,
    'interval_minutes',
    greatest(1, ceil(v_interval / 60.0)::integer),
    'location',
    jsonb_build_object(
      'id',
      v_row.id,
      'latitude',
      v_row.latitude,
      'longitude',
      v_row.longitude,
      'accuracy',
      v_row.accuracy,
      'recorded_at',
      v_row.created_at
    )
  );
end;
$$;

revoke all on function public.insert_mobile_location(
  text,
  double precision,
  double precision,
  double precision,
  text,
  integer,
  text,
  text,
  boolean
) from public;

grant execute on function public.insert_mobile_location(
  text,
  double precision,
  double precision,
  double precision,
  text,
  integer,
  text,
  text,
  boolean
) to anon, authenticated;
