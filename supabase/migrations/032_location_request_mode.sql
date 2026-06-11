-- Force location delivery mode: silent (auto GPS) or alarm (prompt patroller).

alter table public.location_request_batches
  add column if not exists request_mode text not null default 'silent'
  check (request_mode in ('silent', 'alarm'));

comment on column public.location_request_batches.request_mode is
  'silent = auto GPS when tracking; alarm = orange edge alert + Send Location button';

create or replace function public.get_mobile_location_requests(p_token text)
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
    'requests', coalesce((
      select jsonb_agg(row_to_json(row_data) order by row_data.requested_at asc)
      from (
        select
          i.id,
          i.batch_id,
          i.requested_at,
          coalesce(b.request_mode, 'silent') as request_mode
        from public.location_request_items i
        join public.location_request_batches b on b.id = i.batch_id
        where i.access_token_id = v_token_id
          and i.status = 'pending'
          and i.requested_at > now() - interval '3 minutes'
        order by i.requested_at asc
      ) as row_data
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.create_location_request_batch(
  p_access_token_ids uuid[],
  p_created_by uuid default null,
  p_label text default null,
  p_request_mode text default 'silent'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch public.location_request_batches%rowtype;
  v_ids uuid[];
  v_count integer;
  v_mode text;
begin
  select coalesce(array_agg(distinct token_id), '{}'::uuid[])
  into v_ids
  from unnest(p_access_token_ids) as token_id
  where token_id is not null;

  v_count := coalesce(array_length(v_ids, 1), 0);
  if v_count = 0 then
    return jsonb_build_object('ok', false, 'error', 'No units selected.');
  end if;

  v_mode := lower(trim(coalesce(p_request_mode, 'silent')));
  if v_mode not in ('silent', 'alarm') then
    v_mode := 'silent';
  end if;

  insert into public.location_request_batches (
    created_by,
    label,
    request_mode,
    total_count,
    pending_count
  )
  values (
    p_created_by,
    nullif(trim(coalesce(p_label, '')), ''),
    v_mode,
    v_count,
    v_count
  )
  returning * into v_batch;

  insert into public.location_request_items (batch_id, access_token_id)
  select v_batch.id, token_id
  from unnest(v_ids) as token_id;

  return jsonb_build_object(
    'ok', true,
    'batch', row_to_json(v_batch),
    'item_count', v_count
  );
end;
$$;

revoke all on function public.create_location_request_batch(uuid[], uuid, text, text) from public;
grant execute on function public.create_location_request_batch(uuid[], uuid, text, text) to service_role;
