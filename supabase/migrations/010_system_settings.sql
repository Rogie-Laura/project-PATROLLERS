-- Editable system settings (location send interval, etc.)
-- Run after 009_device_metrics.sql

create table if not exists public.system_settings (
  id                        text primary key default 'default',
  location_interval_seconds integer not null default 1800
    check (location_interval_seconds >= 30 and location_interval_seconds <= 86400),
  updated_at                timestamptz not null default now(),
  updated_by                uuid references public."user"(id) on delete set null
);

insert into public.system_settings (id, location_interval_seconds)
values ('default', 1800)
on conflict (id) do nothing;

alter table public.system_settings enable row level security;
