-- Routing provider for dispatch directions (google | osrm)
alter table public.system_settings
  add column if not exists directions_provider text not null default 'osrm'
  check (directions_provider in ('google', 'osrm'));

update public.system_settings
set directions_provider = 'osrm'
where directions_provider is null;
