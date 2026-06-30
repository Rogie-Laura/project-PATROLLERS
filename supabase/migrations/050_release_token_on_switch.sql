-- Release device binding when a phone switches to a different access token.

create or replace function public.release_mobile_device_binding(
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
  v_device text := nullif(trim(coalesce(p_device_id, '')), '');
  v_released boolean := false;
begin
  p_token := trim(coalesce(p_token, ''));
  if p_token = '' then
    return jsonb_build_object('ok', false, 'error', 'Missing access token.');
  end if;

  if v_device is null then
    return jsonb_build_object('ok', false, 'error', 'Missing device id.');
  end if;

  select id into v_token_id
  from public.access_tokens
  where token = p_token and is_active = true;

  if v_token_id is null then
    return jsonb_build_object('ok', true, 'released', false);
  end if;

  update public.mobile_device_profiles
  set
    bound_device_id = null,
    device_bound_at = null,
    live_tracking_active = false,
    updated_at = now()
  where access_token_id = v_token_id
    and (bound_device_id is null or bound_device_id = v_device);

  v_released := found;

  return jsonb_build_object('ok', true, 'released', v_released);
end;
$$;

revoke all on function public.release_mobile_device_binding(text, text) from public;
grant execute on function public.release_mobile_device_binding(text, text) to anon, authenticated;
