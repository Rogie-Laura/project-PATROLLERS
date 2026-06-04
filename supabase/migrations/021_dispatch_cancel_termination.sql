-- Support command-center cancel: stamp cancelled_at and notify mobile units once.

alter table public.call_response_dispatches
  add column if not exists cancelled_at timestamptz;

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
    ), '[]'::jsonb),
    'terminations', coalesce((
      select jsonb_agg(row_to_json(term_row) order by term_row.cancelled_at desc)
      from (
        select
          d.id,
          d.role,
          d.cancelled_at,
          'Response has been terminated by the Command Center.' as message
        from public.call_response_dispatches d
        where d.access_token_id = v_token_id
          and d.status = 'cancelled'
          and d.cancelled_at is not null
          and d.cancelled_at > now() - interval '30 minutes'
        order by d.cancelled_at desc
        limit 5
      ) as term_row
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_mobile_dispatches(text) from public;
grant execute on function public.get_mobile_dispatches(text) to anon, authenticated;
