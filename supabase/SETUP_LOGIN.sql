-- PATROLLERS: one-time setup for email login + default monitor account
-- Run this entire file in Supabase Dashboard → SQL Editor → Run
--
-- Login after run:
--   Email:    rjl11@gmail.com
--   Password: 111111

-- 1) Email column + normalize trigger (from 004)
alter table public."user"
  add column if not exists email text;

alter table public."user"
  alter column badge_number drop not null;

create or replace function public.normalize_user_email()
returns trigger
language plpgsql
as $$
begin
  new.email := nullif(lower(trim(new.email)), '');
  return new;
end;
$$;

drop trigger if exists trg_normalize_user_email on public."user";
create trigger trg_normalize_user_email
  before insert or update on public."user"
  for each row execute function public.normalize_user_email();

create unique index if not exists user_email_unique_idx
  on public."user" (email);

-- 2) Default monitor user (from 005)
insert into public."user" (
  email,
  password,
  full_name,
  rank,
  badge_number,
  role,
  office,
  unit
) values (
  'rjl11@gmail.com',
  '111111',
  'Rogie Laura',
  'PSSg',
  '226609',
  'phq',
  'PRO4A',
  'RICTMD4A'
)
on conflict (email) do update set
  password = excluded.password,
  full_name = excluded.full_name,
  rank = excluded.rank,
  badge_number = excluded.badge_number,
  role = excluded.role,
  office = excluded.office,
  unit = excluded.unit;

-- 3) Verify (should return 1 row)
select email, full_name, role from public."user" where email = 'rjl11@gmail.com';
