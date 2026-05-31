-- PATROLLERS: custom Badge Number login
-- Adds the `user` table, single-device session support, and relinks
-- location_updates to the new user table.
-- Run this in Supabase SQL Editor (Dashboard -> SQL -> New query).

-- 1) User table (note: "user" is a reserved word, so it must be quoted)
create table if not exists public."user" (
  id            uuid primary key default gen_random_uuid(),
  rank          text,
  full_name     text,
  rank_fullname text,
  badge_number  text not null unique,
  office        text,
  unit          text,
  password      text not null,
  role          text not null default 'Patroller'
                  check (role in ('Patroller', 'stn', 'phq', 'RCC')),
  session       text,
  created_at    timestamptz not null default now()
);

-- 2) Auto-fill rank_fullname = "Rank Full_Name" (e.g. "PSSg Rogie Laura")
create or replace function public.set_rank_fullname()
returns trigger
language plpgsql
as $$
begin
  new.rank_fullname := nullif(trim(concat_ws(' ', new.rank, new.full_name)), '');
  return new;
end;
$$;

drop trigger if exists trg_set_rank_fullname on public."user";
create trigger trg_set_rank_fullname
  before insert or update on public."user"
  for each row execute function public.set_rank_fullname();

-- 3) Lock down the table: only the server (service role) may read/write it.
--    No anon/authenticated policies = the public anon key cannot read passwords.
alter table public."user" enable row level security;

create index if not exists user_session_idx on public."user" (session);
create index if not exists user_badge_number_idx on public."user" (badge_number);

-- 4) Relink location_updates from Supabase Auth to the new user table.
drop policy if exists "Patrols can insert own location" on public.location_updates;
drop policy if exists "Patrols can read own locations" on public.location_updates;
drop policy if exists "Authenticated users can read all locations" on public.location_updates;

alter table public.location_updates
  drop constraint if exists location_updates_user_id_fkey;

alter table public.location_updates
  add column if not exists badge_number text;

-- Monitor dashboard keeps public read access (inserts happen via the server).
drop policy if exists "Public can read locations for monitoring" on public.location_updates;
create policy "Public can read locations for monitoring"
  on public.location_updates for select
  using (true);
