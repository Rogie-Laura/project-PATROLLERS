-- Explicit mobile ack after GPS send + relax auto-fulfill window.

create or replace function public.fulfill_pending_location_requests()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
begin
  if NEW.access_token_id is null then
    return NEW;
  end if;

  for v_item in
    select i.id, i.batch_id
    from public.location_request_items i
    where i.access_token_id = NEW.access_token_id
      and i.status = 'pending'
    order by i.requested_at asc
    for update
  loop
    update public.location_request_items
    set
      status = 'success',
      responded_at = now(),
      location_update_id = NEW.id
    where id = v_item.id;

    update public.location_request_batches
    set
      success_count = success_count + 1,
      pending_count = greatest(0, pending_count - 1)
    where id = v_item.batch_id;
  end loop;

  return NEW;
end;
$$;

create or replace function public.acknowledge_location_request(
  p_token text,
  p_item_id uuid,
  p_location_update_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token_id uuid;
  v_item public.location_request_items%rowtype;
  v_loc_id uuid;
begin
  p_token := trim(coalesce(p_token, ''));
  if p_token = '' or p_item_id is null then
    return jsonb_build_object('ok', false, 'error', 'Missing token or request id.');
  end if;

  select id into v_token_id
  from public.access_tokens
  where token = p_token and is_active = true;

  if v_token_id is null then
    return jsonb_build_object('ok', false, 'error', 'Invalid or inactive access token.');
  end if;

  select * into v_item
  from public.location_request_items
  where id = p_item_id
    and access_token_id = v_token_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Request not found.');
  end if;

  if v_item.status = 'success' then
    return jsonb_build_object('ok', true, 'already', true);
  end if;

  if v_item.status = 'failed' then
    return jsonb_build_object('ok', false, 'error', 'Request already timed out.');
  end if;

  v_loc_id := p_location_update_id;
  if v_loc_id is not null then
    if not exists (
      select 1
      from public.location_updates
      where id = v_loc_id
        and access_token_id = v_token_id
    ) then
      return jsonb_build_object('ok', false, 'error', 'Location does not match this unit.');
    end if;
  else
    select id into v_loc_id
    from public.location_updates
    where access_token_id = v_token_id
    order by created_at desc
    limit 1;
  end if;

  if v_loc_id is null then
    return jsonb_build_object('ok', false, 'error', 'No location received yet.');
  end if;

  update public.location_request_items
  set
    status = 'success',
    responded_at = now(),
    location_update_id = v_loc_id
  where id = v_item.id;

  update public.location_request_batches
  set
    success_count = success_count + 1,
    pending_count = greatest(0, pending_count - 1)
  where id = v_item.batch_id;

  return jsonb_build_object(
    'ok',
    true,
    'location_update_id',
    v_loc_id
  );
end;
$$;

revoke all on function public.acknowledge_location_request(text, uuid, uuid) from public;
grant execute on function public.acknowledge_location_request(text, uuid, uuid) to service_role;
