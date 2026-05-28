-- Patrollers: location monitoring schema
-- Run this in Supabase SQL Editor (Dashboard → SQL → New query)

-- Profiles linked to auth users
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'patrol' check (role in ('patrol', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins can read all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'patrol')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Location updates from patrol devices
create table if not exists public.location_updates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  patrol_name text,
  latitude double precision not null,
  longitude double precision not null,
  accuracy double precision,
  created_at timestamptz not null default now()
);

create index if not exists location_updates_user_id_idx
  on public.location_updates (user_id);

create index if not exists location_updates_created_at_idx
  on public.location_updates (created_at desc);

alter table public.location_updates enable row level security;

-- Patrols can insert their own location
create policy "Patrols can insert own location"
  on public.location_updates for insert
  with check (auth.uid() = user_id);

-- Patrols can read own locations
create policy "Patrols can read own locations"
  on public.location_updates for select
  using (auth.uid() = user_id);

-- Admins and monitor dashboard: allow authenticated read of all locations
create policy "Authenticated users can read all locations"
  on public.location_updates for select
  using (auth.role() = 'authenticated');

-- Monitor dashboard can read all locations without login
create policy "Public can read locations for monitoring"
  on public.location_updates for select
  using (true);

-- Enable realtime for live map updates
alter publication supabase_realtime add table public.location_updates;
