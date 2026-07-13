-- Smart Locator station access via token (no username/password)

create table if not exists public.smart_locator_access_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null,
  office text not null default '',
  unit text not null default '',
  label text not null default '',
  role text not null default 'SCC'
    check (role in ('SCC', 'PCC', 'RCC')),
  is_active boolean not null default true,
  session text,
  session_started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists smart_locator_access_tokens_token_unique_idx
  on public.smart_locator_access_tokens (lower(trim(token)));

create unique index if not exists smart_locator_access_tokens_session_unique_idx
  on public.smart_locator_access_tokens (session)
  where session is not null;

create index if not exists smart_locator_access_tokens_office_unit_idx
  on public.smart_locator_access_tokens (office, unit);

alter table public.smart_locator_access_tokens enable row level security;

insert into public.smart_locator_access_tokens (token, office, unit, label, role, is_active)
select
  'ROSARIO-MPS-2026',
  'Cavite PPO',
  'Rosario MPS',
  'Rosario MPS Smart Locator',
  'SCC',
  true
where not exists (
  select 1
  from public.smart_locator_access_tokens
  where lower(trim(token)) = lower('ROSARIO-MPS-2026')
);
