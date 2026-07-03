-- Username login (Smart Locator and optional monitor accounts)

alter table public."user"
  add column if not exists username text;

create or replace function public.normalize_user_username()
returns trigger
language plpgsql
as $$
begin
  new.username := nullif(lower(trim(new.username)), '');
  return new;
end;
$$;

drop trigger if exists trg_normalize_user_username on public."user";
create trigger trg_normalize_user_username
  before insert or update on public."user"
  for each row execute function public.normalize_user_username();

create unique index if not exists user_username_unique_idx
  on public."user" (username)
  where username is not null;
