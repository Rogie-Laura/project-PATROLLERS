-- Tracking state and network signal strength for live markers
-- tracking_active = false means the unit pressed Stop Tracking (hide marker)
alter table public.location_updates
  add column if not exists tracking_active boolean not null default true;

-- signal_level: 'strong' | 'weak' | 'none' (signal STRENGTH, not connection mode)
alter table public.location_updates
  add column if not exists signal_level text;
