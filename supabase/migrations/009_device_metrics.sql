-- Battery and network signal reported with mobile location updates
alter table public.location_updates
  add column if not exists battery_level smallint;

alter table public.location_updates
  add column if not exists signal_label text;
