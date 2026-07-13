-- System-wide Smart Locator marker size (System Administrator sets; all accounts use)
alter table public.system_settings
  add column if not exists smart_locator_marker_size jsonb not null
    default '{"presetId":"default","customSizes":null}'::jsonb;

update public.system_settings
set smart_locator_marker_size = coalesce(
  smart_locator_marker_size,
  '{"presetId":"default","customSizes":null}'::jsonb
)
where id = 'default';
