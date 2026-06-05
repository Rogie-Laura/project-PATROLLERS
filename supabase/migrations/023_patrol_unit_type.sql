-- Patrol unit type for legend counts (mobile, motorcycle, beat/foot, bike).

alter table public.mobile_device_profiles
  add column if not exists patrol_unit_type text;

alter table public.location_updates
  add column if not exists patrol_unit_type text;

comment on column public.mobile_device_profiles.patrol_unit_type is
  'mobile_patrol | motorcycle_patrol | beat_patrol | bike_patrol';
