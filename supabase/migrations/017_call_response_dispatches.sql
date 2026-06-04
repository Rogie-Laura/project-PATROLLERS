-- Mobile dispatch alerts for call response incidents (primary + dragnet/cordon).

create table if not exists public.call_response_dispatches (
  id                uuid primary key default gen_random_uuid(),
  call_response_id  uuid not null references public.call_responses(id) on delete cascade,
  access_token_id   uuid not null references public.access_tokens(id) on delete cascade,
  role              text not null check (role in ('primary', 'cordon')),
  title             text not null,
  message           text not null,
  distance_meters   integer,
  status            text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at        timestamptz not null default now(),
  responded_at      timestamptz
);

create index if not exists call_response_dispatches_call_idx
  on public.call_response_dispatches (call_response_id, created_at desc);

create index if not exists call_response_dispatches_token_pending_idx
  on public.call_response_dispatches (access_token_id, created_at desc)
  where status = 'pending';

alter table public.call_response_dispatches enable row level security;

alter publication supabase_realtime add table public.call_response_dispatches;

-- Pending dispatch alerts for a mobile access token.
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
          and d.status = 'pending'
          and cr.status = 'active'
        order by d.created_at desc
      ) as row_data
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_mobile_dispatches(text) from public;
grant execute on function public.get_mobile_dispatches(text) to anon, authenticated;

-- Accept or decline a dispatch alert from mobile.
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

  if p_action = 'accept' then
    v_next_status := 'accepted';
  elsif p_action = 'decline' then
    v_next_status := 'declined';
  else
    return jsonb_build_object('ok', false, 'error', 'Invalid action. Use accept or decline.');
  end if;

  select * into v_row
  from public.call_response_dispatches
  where id = p_dispatch_id
    and access_token_id = v_token_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Dispatch alert not found.');
  end if;

  if v_row.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'Dispatch alert is no longer pending.');
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
