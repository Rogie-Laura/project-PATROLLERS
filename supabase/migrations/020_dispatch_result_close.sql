-- Allow a mobile unit to close its dispatch with a result/outcome.

alter table public.call_response_dispatches
  add column if not exists result text,
  add column if not exists result_note text,
  add column if not exists closed_at timestamptz;

alter table public.call_response_dispatches
  drop constraint if exists call_response_dispatches_status_check;

alter table public.call_response_dispatches
  add constraint call_response_dispatches_status_check
  check (status in ('pending', 'accepted', 'arrived', 'completed', 'declined', 'cancelled'));

-- Close a dispatch from mobile with a reported result. Only the owning unit
-- may close, and only once it has at least acknowledged.
create or replace function public.close_mobile_dispatch(
  p_token text,
  p_dispatch_id uuid,
  p_result text,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token_id uuid;
  v_row public.call_response_dispatches%rowtype;
  v_now timestamptz := now();
begin
  select id into v_token_id
  from public.access_tokens
  where token = p_token and is_active = true;

  if v_token_id is null then
    return jsonb_build_object('ok', false, 'error', 'Invalid or inactive access token.');
  end if;

  if coalesce(trim(p_result), '') = '' then
    return jsonb_build_object('ok', false, 'error', 'A result is required.');
  end if;

  select * into v_row
  from public.call_response_dispatches
  where id = p_dispatch_id
    and access_token_id = v_token_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Dispatch alert not found.');
  end if;

  if v_row.status not in ('accepted', 'arrived') then
    return jsonb_build_object('ok', false, 'error', 'Acknowledge the dispatch before closing.');
  end if;

  update public.call_response_dispatches
  set
    status = 'completed',
    result = p_result,
    result_note = nullif(trim(coalesce(p_note, '')), ''),
    closed_at = v_now,
    responded_at = v_now
  where id = p_dispatch_id;

  return jsonb_build_object(
    'ok', true,
    'dispatch_id', p_dispatch_id,
    'status', 'completed'
  );
end;
$$;

revoke all on function public.close_mobile_dispatch(text, uuid, text, text) from public;
grant execute on function public.close_mobile_dispatch(text, uuid, text, text) to anon, authenticated;
