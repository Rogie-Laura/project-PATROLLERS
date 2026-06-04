-- Add "arrived" status to dispatch alerts and surface acknowledged/arrived
-- dispatches to mobile so the unit can track its own dispatch state.

alter table public.call_response_dispatches
  drop constraint if exists call_response_dispatches_status_check;

alter table public.call_response_dispatches
  add constraint call_response_dispatches_status_check
  check (status in ('pending', 'accepted', 'arrived', 'declined', 'cancelled'));

-- Return pending + accepted + arrived dispatches for active incidents so the
-- mobile app can render an ongoing dispatch card (not just new alarms).
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

-- Accept, decline, or mark arrived. Pending -> accepted/declined,
-- accepted -> arrived.
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
  elsif p_action = 'decline' then
    if v_row.status <> 'pending' then
      return jsonb_build_object('ok', false, 'error', 'Dispatch alert is no longer pending.');
    end if;
    v_next_status := 'declined';
  elsif p_action = 'arrive' then
    if v_row.status <> 'accepted' then
      return jsonb_build_object('ok', false, 'error', 'Acknowledge the dispatch before marking arrived.');
    end if;
    v_next_status := 'arrived';
  else
    return jsonb_build_object('ok', false, 'error', 'Invalid action.');
  end if;

  update public.call_response_dispatches
  set
    status = v_next_status,
    responded_at = now()
  where id = p_dispatch_id;

  return jsonb_build_object(
    'ok', true,
    'dispatch_id', p_dispatch_id,
    'status', v_next_status
  );
end;
$$;

revoke all on function public.respond_mobile_dispatch(text, uuid, text) from public;
grant execute on function public.respond_mobile_dispatch(text, uuid, text) to anon, authenticated;
