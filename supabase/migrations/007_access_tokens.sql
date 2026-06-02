-- Mobile patrol access tokens + device profiles
-- Run after 006_seed_patrol1_location.sql

-- Allow System Administrator role for token management
alter table public."user" drop constraint if exists user_role_check;
alter table public."user"
  add constraint user_role_check
  check (role in ('Patroller', 'stn', 'phq', 'RCC', 'System Administrator'));

-- Admin-created tokens assigned to patrol mobile devices
create table if not exists public.access_tokens (
  id         uuid primary key default gen_random_uuid(),
  token      text not null unique,
  label      text,
  created_by uuid references public."user"(id) on delete set null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists access_tokens_token_idx on public.access_tokens (token);
alter table public.access_tokens enable row level security;

-- Vehicle / unit info saved from the mobile app (one profile per token)
create table if not exists public.mobile_device_profiles (
  id                  uuid primary key default gen_random_uuid(),
  access_token_id     uuid not null unique references public.access_tokens(id) on delete cascade,
  mobile_plate        text,
  mobile_phone        text,
  radio_call_sign     text,
  office              text,
  unit                text,
  personnel_on_board  jsonb not null default '[]'::jsonb,
  updated_at          timestamptz not null default now()
);

create index if not exists mobile_device_profiles_token_idx
  on public.mobile_device_profiles (access_token_id);

alter table public.mobile_device_profiles enable row level security;

-- Attach mobile context to location updates for the monitoring map
alter table public.location_updates
  alter column user_id drop not null;

alter table public.location_updates
  add column if not exists access_token_id uuid references public.access_tokens(id) on delete set null;

alter table public.location_updates
  add column if not exists mobile_plate text;

alter table public.location_updates
  add column if not exists mobile_phone text;

alter table public.location_updates
  add column if not exists radio_call_sign text;

alter table public.location_updates
  add column if not exists office text;

alter table public.location_updates
  add column if not exists unit text;

alter table public.location_updates
  add column if not exists personnel_on_board jsonb;

create index if not exists location_updates_access_token_id_idx
  on public.location_updates (access_token_id);

-- Demo token for Flutter / emulator testing
insert into public.access_tokens (token, label, is_active)
values ('PATROLLERS-DEMO-001', 'Demo Mobile Unit', true)
on conflict (token) do update set
  label = excluded.label,
  is_active = excluded.is_active;
