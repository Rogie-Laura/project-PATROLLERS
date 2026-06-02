-- PATROLLERS: switch login from Badge Number to Email + Password
-- Run this in Supabase SQL Editor (Dashboard -> SQL -> New query).

-- 1) Add the email column used for login.
alter table public."user"
  add column if not exists email text;

-- 2) Badge number is no longer required to sign in.
alter table public."user"
  alter column badge_number drop not null;

-- 3) Always store email lowercased + trimmed so logins are case-insensitive.
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

-- 4) Enforce one account per email (case-insensitive, ignores NULLs).
create unique index if not exists user_email_unique_idx
  on public."user" (email);
