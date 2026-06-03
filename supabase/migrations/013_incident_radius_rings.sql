-- Configurable incident / call response radius circles (up to 5)
alter table public.system_settings
  add column if not exists incident_radius_rings jsonb not null default '[
    {"enabled": true, "radiusKm": 1, "color": "#ef4444"},
    {"enabled": true, "radiusKm": 3, "color": "#f97316"},
    {"enabled": true, "radiusKm": 6, "color": "#eab308"},
    {"enabled": false, "radiusKm": 10, "color": "#3b82f6"},
    {"enabled": false, "radiusKm": 12, "color": "#8b5cf6"}
  ]'::jsonb;
