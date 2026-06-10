-- P0 Phase 2: FCM device tokens for dispatch + silent force-location when app is backgrounded.

create table if not exists public.mobile_fcm_tokens (
  access_token_id  uuid primary key references public.access_tokens(id) on delete cascade,
  fcm_token        text not null,
  updated_at       timestamptz not null default now()
);

create index if not exists mobile_fcm_tokens_updated_idx
  on public.mobile_fcm_tokens (updated_at desc);

alter table public.mobile_fcm_tokens enable row level security;

create or replace function public.upsert_mobile_fcm_token(p_token text, p_fcm_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token_id uuid;
  v_fcm text;
begin
  p_token := trim(coalesce(p_token, ''));
  v_fcm := trim(coalesce(p_fcm_token, ''));

  if p_token = '' then
    return jsonb_build_object('ok', false, 'error', 'Missing access token.');
  end if;

  if v_fcm = '' then
    return jsonb_build_object('ok', false, 'error', 'Missing FCM token.');
  end if;

  select id into v_token_id
  from public.access_tokens
  where token = p_token and is_active = true;

  if v_token_id is null then
    return jsonb_build_object('ok', false, 'error', 'Invalid or inactive access token.');
  end if;

  insert into public.mobile_fcm_tokens (access_token_id, fcm_token, updated_at)
  values (v_token_id, v_fcm, now())
  on conflict (access_token_id) do update
  set fcm_token = excluded.fcm_token, updated_at = now();

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.upsert_mobile_fcm_token(text, text) from public;
grant execute on function public.upsert_mobile_fcm_token(text, text) to anon, authenticated;
