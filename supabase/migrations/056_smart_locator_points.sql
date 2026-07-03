-- Smart Locator: plotted map points (installations, establishments, etc.)

create table if not exists public.smart_locator_points (
  id            uuid primary key default gen_random_uuid(),
  category      text not null
    check (category in (
      'vital_installation',
      'business_establishment',
      'government_office',
      'pnp_installation',
      'other'
    )),
  label         text not null default '',
  description   text,
  latitude      double precision not null
    check (latitude >= -90 and latitude <= 90),
  longitude     double precision not null
    check (longitude >= -180 and longitude <= 180),
  office        text not null default '',
  unit          text not null default '',
  created_by    uuid references public."user"(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists smart_locator_points_office_unit_idx
  on public.smart_locator_points (office, unit);

create index if not exists smart_locator_points_category_idx
  on public.smart_locator_points (category);

alter table public.smart_locator_points enable row level security;
