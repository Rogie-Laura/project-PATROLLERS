-- Optional remarks for Friendly Forces
alter table public.friendly_forces
  add column if not exists remarks text;
