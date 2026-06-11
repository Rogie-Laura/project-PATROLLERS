-- Operator closes a force-location batch; remaining pending units stop receiving the request.

create or replace function public.close_location_request_batch(p_batch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_closed integer;
begin
  if p_batch_id is null then
    return jsonb_build_object('ok', false, 'error', 'Missing batch id.');
  end if;

  if not exists (
    select 1 from public.location_request_batches where id = p_batch_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'Batch not found.');
  end if;

  with closed as (
    update public.location_request_items
    set
      status = 'failed',
      responded_at = now(),
      failure_reason = 'Closed by command center.'
    where batch_id = p_batch_id
      and status = 'pending'
    returning id
  )
  select count(*)::integer into v_closed from closed;

  if v_closed > 0 then
    update public.location_request_batches
    set
      failed_count = failed_count + v_closed,
      pending_count = greatest(0, pending_count - v_closed)
    where id = p_batch_id;
  end if;

  return jsonb_build_object('ok', true, 'closed', v_closed);
end;
$$;

revoke all on function public.close_location_request_batch(uuid) from public;
grant execute on function public.close_location_request_batch(uuid) to service_role;
