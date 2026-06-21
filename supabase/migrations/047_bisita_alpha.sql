-- Bisita Alpha records submitted from the mobile patrol app.
create table if not exists public.bisita_alpha_records (
  id                      uuid primary key default gen_random_uuid(),
  access_token_id         uuid not null references public.access_tokens(id) on delete cascade,
  office                  text,
  unit                    text,
  mobile_plate            text,
  radio_call_sign         text,
  personnel_on_board      jsonb not null default '[]'::jsonb,
  location_label          text not null,
  owner_name              text not null,
  stolen_items_recovered  integer not null default 0 check (stolen_items_recovered >= 0),
  latitude                double precision not null,
  longitude               double precision not null,
  recorded_at             timestamptz not null,
  created_at              timestamptz not null default now()
);

create index if not exists bisita_alpha_records_recorded_idx
  on public.bisita_alpha_records (recorded_at desc);

create index if not exists bisita_alpha_records_office_unit_idx
  on public.bisita_alpha_records (office, unit, recorded_at desc);

alter table public.bisita_alpha_records enable row level security;
