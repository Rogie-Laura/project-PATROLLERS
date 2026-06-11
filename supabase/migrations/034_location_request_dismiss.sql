-- Mobile can dismiss or acknowledge force-location items directly (no Vercel hop).

create or replace function public.dismiss_location_request(
  p_token text,
  p_item_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token_id uuid;
  v_item public.location_request_items%rowtype;
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

  if v_item.status <> 'pending' then
    return jsonb_build_object('ok', true, 'already', true, 'status', v_item.status);
  end if;

  update public.location_request_items
  set
    status = 'failed',
    responded_at = now(),
    failure_reason = 'Dismissed by unit.'
  where id = v_item.id;

  update public.location_request_batches
  set
    failed_count = failed_count + 1,
    pending_count = greatest(0, pending_count - 1)
  where id = v_item.batch_id;

  return jsonb_build_object('ok', true, 'status', 'failed');
end;
$$;

revoke all on function public.dismiss_location_request(text, uuid) from public;
grant execute on function public.dismiss_location_request(text, uuid) to anon, authenticated;

revoke all on function public.acknowledge_location_request(text, uuid, uuid) from public;
grant execute on function public.acknowledge_location_request(text, uuid, uuid) to anon, authenticated;
