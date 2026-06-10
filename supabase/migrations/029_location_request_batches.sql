-- P2: Force location — monitor requests fresh GPS from mobile units (silent, no alarm).

create table if not exists public.location_request_batches (
  id              uuid primary key default gen_random_uuid(),
  created_by      uuid references public."user"(id) on delete set null,
  created_at      timestamptz not null default now(),
  label           text,
  total_count     integer not null default 0 check (total_count >= 0),
  success_count   integer not null default 0 check (success_count >= 0),
  failed_count    integer not null default 0 check (failed_count >= 0),
  pending_count   integer not null default 0 check (pending_count >= 0)
);

create table if not exists public.location_request_items (
  id                  uuid primary key default gen_random_uuid(),
  batch_id            uuid not null references public.location_request_batches(id) on delete cascade,
  access_token_id     uuid not null references public.access_tokens(id) on delete cascade,
  status              text not null default 'pending'
    check (status in ('pending', 'success', 'failed')),
  requested_at        timestamptz not null default now(),
  responded_at        timestamptz,
  location_update_id  uuid references public.location_updates(id) on delete set null,
  failure_reason      text
);

create index if not exists location_request_items_batch_idx
  on public.location_request_items (batch_id, requested_at);

create index if not exists location_request_items_token_pending_idx
  on public.location_request_items (access_token_id, requested_at desc)
  where status = 'pending';

alter table public.location_request_batches enable row level security;
alter table public.location_request_items enable row level security;

alter publication supabase_realtime add table public.location_request_items;

-- Pending force-location requests for a mobile token (Realtime backup to FCM).
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
          i.requested_at
        from public.location_request_items i
        where i.access_token_id = v_token_id
          and i.status = 'pending'
          and i.requested_at > now() - interval '3 minutes'
        order by i.requested_at asc
      ) as row_data
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_mobile_location_requests(text) from public;
grant execute on function public.get_mobile_location_requests(text) to anon, authenticated;

create or replace function public.create_location_request_batch(
  p_access_token_ids uuid[],
  p_created_by uuid default null,
  p_label text default null
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
begin
  select coalesce(array_agg(distinct token_id), '{}'::uuid[])
  into v_ids
  from unnest(p_access_token_ids) as token_id
  where token_id is not null;

  v_count := coalesce(array_length(v_ids, 1), 0);
  if v_count = 0 then
    return jsonb_build_object('ok', false, 'error', 'No units selected.');
  end if;

  insert into public.location_request_batches (
    created_by,
    label,
    total_count,
    pending_count
  )
  values (
    p_created_by,
    nullif(trim(coalesce(p_label, '')), ''),
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

revoke all on function public.create_location_request_batch(uuid[], uuid, text) from public;
grant execute on function public.create_location_request_batch(uuid[], uuid, text) to service_role;

create or replace function public.fail_stale_location_request_items(
  p_batch_id uuid,
  p_timeout_seconds integer default 90
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_failed integer;
begin
  if p_batch_id is null then
    return jsonb_build_object('ok', false, 'error', 'Missing batch id.');
  end if;

  with stale as (
    update public.location_request_items
    set
      status = 'failed',
      responded_at = now(),
      failure_reason = 'Timeout — no response from mobile unit.'
    where batch_id = p_batch_id
      and status = 'pending'
      and requested_at < now() - (greatest(p_timeout_seconds, 30) || ' seconds')::interval
    returning id
  )
  select count(*)::integer into v_failed from stale;

  if v_failed > 0 then
    update public.location_request_batches
    set
      failed_count = failed_count + v_failed,
      pending_count = greatest(0, pending_count - v_failed)
    where id = p_batch_id;
  end if;

  return jsonb_build_object('ok', true, 'failed', v_failed);
end;
$$;

revoke all on function public.fail_stale_location_request_items(uuid, integer) from public;
grant execute on function public.fail_stale_location_request_items(uuid, integer) to service_role;

-- When mobile sends GPS, auto-complete pending force-location requests for that unit.
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
      and i.requested_at > now() - interval '3 minutes'
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

drop trigger if exists location_updates_fulfill_requests on public.location_updates;

create trigger location_updates_fulfill_requests
  after insert on public.location_updates
  for each row
  execute function public.fulfill_pending_location_requests();
