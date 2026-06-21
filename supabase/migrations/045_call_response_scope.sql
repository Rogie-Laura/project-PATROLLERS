-- Scope call responses (incidents) per command-center account, mirroring the
-- marker scope. Each incident is tagged with the creating account's office/unit:
--   RCC / System Administrator : sees all incidents (created with empty scope)
--   PCC (Provincial)           : sees incidents whose office matches
--   SCC (Station)              : sees incidents whose office AND unit match
-- This makes station / provincial monitoring accounts independent — they only
-- see and act on their own call responses, not the whole region's.

alter table public.call_responses
  add column if not exists office text,
  add column if not exists unit text;

create index if not exists call_responses_office_unit_idx
  on public.call_responses (office, unit);
