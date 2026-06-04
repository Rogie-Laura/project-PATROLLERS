-- Track separate timestamps for when a dispatch is acknowledged vs arrived so
-- both the mobile card and the monitoring center can show date/time per step.

alter table public.call_response_dispatches
  add column if not exists acknowledged_at timestamptz,
  add column if not exists arrived_at timestamptz;

-- Surface the new timestamps to mobile.
create or replace function public.get_mobile_dispatches(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token_id uuid;
begin
  select id into v_token_id
  from public.access_tokens
  where token = p_token and is_active = true;

  if v_token_id is null then
    return jsonb_build_object('ok', false, 'error', 'Invalid or inactive access token.');
  end if;

  return jsonb_build_object(
    'ok', true,
    'dispatches', coalesce((
      select jsonb_agg(row_to_json(row_data) order by row_data.created_at desc)
      from (
        select
          d.id,
          d.role,
          d.title,
          d.message,
          d.status,
          d.distance_meters,
          d.created_at,
          d.acknowledged_at,
          d.arrived_at,
          cr.id as call_response_id,
          cr.latitude,
          cr.longitude,
          cr.label as incident_label
        from public.call_response_dispatches d
        join public.call_responses cr on cr.id = d.call_response_id
        where d.access_token_id = v_token_id
          and d.status in ('pending', 'accepted', 'arrived')
          and cr.status = 'active'
        order by d.created_at desc
      ) as row_data
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_mobile_dispatches(text) from public;
grant execute on function public.get_mobile_dispatches(text) to anon, authenticated;

-- Stamp acknowledged_at on accept and arrived_at on arrive.
create or replace function public.respond_mobile_dispatch(
  p_token text,
  p_dispatch_id uuid,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token_id uuid;
  v_row public.call_response_dispatches%rowtype;
  v_next_status text;
  v_now timestamptz := now();
begin
  select id into v_token_id
  from public.access_tokens
  where token = p_token and is_active = true;

  if v_token_id is null then
    return jsonb_build_object('ok', false, 'error', 'Invalid or inactive access token.');
  end if;

  select * into v_row
  from public.call_response_dispatches
  where id = p_dispatch_id
    and access_token_id = v_token_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Dispatch alert not found.');
  end if;

  if p_action = 'accept' then
    if v_row.status <> 'pending' then
      return jsonb_build_object('ok', false, 'error', 'Dispatch alert is no longer pending.');
    end if;
    v_next_status := 'accepted';
    update public.call_response_dispatches
    set status = v_next_status,
        responded_at = v_now,
        acknowledged_at = v_now
    where id = p_dispatch_id;
  elsif p_action = 'decline' then
    if v_row.status <> 'pending' then
      return jsonb_build_object('ok', false, 'error', 'Dispatch alert is no longer pending.');
    end if;
    v_next_status := 'declined';
    update public.call_response_dispatches
    set status = v_next_status,
        responded_at = v_now
    where id = p_dispatch_id;
  elsif p_action = 'arrive' then
    if v_row.status <> 'accepted' then
      return jsonb_build_object('ok', false, 'error', 'Acknowledge the dispatch before marking arrived.');
    end if;
    v_next_status := 'arrived';
    update public.call_response_dispatches
    set status = v_next_status,
        responded_at = v_now,
        arrived_at = v_now
    where id = p_dispatch_id;
  else
    return jsonb_build_object('ok', false, 'error', 'Invalid action.');
  end if;

  return jsonb_build_object(
    'ok', true,
    'dispatch_id', p_dispatch_id,
    'status', v_next_status,
    'acknowledged_at', (select acknowledged_at from public.call_response_dispatches where id = p_dispatch_id),
    'arrived_at', (select arrived_at from public.call_response_dispatches where id = p_dispatch_id)
  );
end;
$$;

revoke all on function public.respond_mobile_dispatch(text, uuid, text) from public;
grant execute on function public.respond_mobile_dispatch(text, uuid, text) to anon, authenticated;
