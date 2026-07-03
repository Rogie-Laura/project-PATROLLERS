-- When true, RCC / PCC / SCC monitoring pages show a billing-unavailable message.
-- System Administrator access is not affected.

alter table public.system_settings
  add column if not exists command_access_suspended boolean not null default false;
