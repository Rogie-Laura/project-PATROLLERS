-- Establishment visitation records submitted from the mobile patrol app.
create table if not exists public.establishment_visitations (
  id                  uuid primary key default gen_random_uuid(),
  access_token_id     uuid not null references public.access_tokens(id) on delete cascade,
  office              text,
  unit                text,
  mobile_plate        text,
  radio_call_sign     text,
  personnel_on_board  jsonb not null default '[]'::jsonb,
  location_label      text not null,
  person_reference    text not null,
  latitude            double precision not null,
  longitude           double precision not null,
  recorded_at         timestamptz not null,
  created_at          timestamptz not null default now()
);

create index if not exists establishment_visitations_recorded_idx
  on public.establishment_visitations (recorded_at desc);

create index if not exists establishment_visitations_office_unit_idx
  on public.establishment_visitations (office, unit, recorded_at desc);

alter table public.establishment_visitations enable row level security;
