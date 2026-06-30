-- Fix: duplicate RPC overloads broke heartbeat/GPS ("function is not unique").
-- Legacy mobile (no device_id) must keep updating last_seen_at.

drop function if exists public.record_mobile_heartbeat(text);

drop function if exists public.insert_mobile_location(
  text,
  double precision,
  double precision,
  double precision,
  text,
  integer,
  text,
  text,
  boolean
);

create or replace function public.resolve_mobile_device_binding(
  p_access_token_id uuid,
  p_device_id text,
  p_bind boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_device text := nullif(trim(coalesce(p_device_id, '')), '');
  v_bound text;
  v_last_seen timestamptz;
  v_stale interval := interval '15 minutes';
begin
  if p_access_token_id is null then
    return jsonb_build_object('ok', false, 'error', 'Missing access token.', 'code', 'invalid_token');
  end if;

  -- Legacy mobile builds send no device id — do not block heartbeat/GPS.
  if v_device is null then
    return jsonb_build_object('ok', true, 'legacy', true);
  end if;

  select bound_device_id, last_seen_at
  into v_bound, v_last_seen
  from public.mobile_device_profiles
  where access_token_id = p_access_token_id;

  if v_bound is null or v_bound = '' then
    if p_bind then
      insert into public.mobile_device_profiles (
        access_token_id,
        bound_device_id,
        device_bound_at,
        updated_at
      )
      values (p_access_token_id, v_device, now(), now())
      on conflict (access_token_id) do update
      set
        bound_device_id = excluded.bound_device_id,
        device_bound_at = excluded.device_bound_at,
        updated_at = excluded.updated_at;
    end if;

    return jsonb_build_object('ok', true, 'bound', true);
  end if;

  if v_bound = v_device then
    if p_bind then
      update public.mobile_device_profiles
      set device_bound_at = now(), updated_at = now()
      where access_token_id = p_access_token_id;
    end if;

    return jsonb_build_object('ok', true);
  end if;

  if v_last_seen is not null and v_last_seen > now() - v_stale then
    return jsonb_build_object(
      'ok',
      false,
      'error',
      'This access token is already in use on another device. Contact your System Administrator if you replaced the duty phone.',
      'code',
      'token_in_use'
    );
  end if;

  if p_bind then
    update public.mobile_device_profiles
    set
      bound_device_id = v_device,
      device_bound_at = now(),
      updated_at = now()
    where access_token_id = p_access_token_id;
  end if;

  return jsonb_build_object('ok', true, 'rebound', true);
end;
$$;

create or replace function public.record_mobile_heartbeat(
  p_token text,
  p_device_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token_id uuid;
  v_seen timestamptz := now();
  v_binding jsonb;
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

  if nullif(trim(coalesce(p_device_id, '')), '') is not null then
    v_binding := public.resolve_mobile_device_binding(v_token_id, p_device_id, false);
    if coalesce(v_binding->>'ok', 'false') <> 'true' then
      return v_binding;
    end if;
  end if;

  insert into public.mobile_device_profiles (access_token_id, last_seen_at, updated_at)
  values (v_token_id, v_seen, v_seen)
  on conflict (access_token_id) do update
  set last_seen_at = v_seen, updated_at = v_seen;

  return jsonb_build_object('ok', true, 'last_seen_at', v_seen);
end;
$$;

revoke all on function public.record_mobile_heartbeat(text, text) from public;
grant execute on function public.record_mobile_heartbeat(text, text) to anon, authenticated;

create or replace function public.insert_mobile_location(
  p_token text,
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy double precision default null,
  p_status text default null,
  p_battery_level integer default null,
  p_signal_label text default null,
  p_signal_level text default null,
  p_tracking_active boolean default true,
  p_device_id text default null
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
  v_binding jsonb;
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

  if nullif(trim(coalesce(p_device_id, '')), '') is not null then
    v_binding := public.resolve_mobile_device_binding(v_access_token.id, p_device_id, false);
    if coalesce(v_binding->>'ok', 'false') <> 'true' then
      return v_binding;
    end if;
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
  boolean,
  text
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
  boolean,
  text
) to anon, authenticated;
