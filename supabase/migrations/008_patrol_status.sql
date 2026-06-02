-- Patrol status for mobile location updates
-- Run after 007_access_tokens.sql

alter table public.location_updates
  add column if not exists patrol_status text;

-- Track the device's current status on its saved profile too
alter table public.mobile_device_profiles
  add column if not exists patrol_status text;
