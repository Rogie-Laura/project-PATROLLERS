-- Active and closed call response incidents for dispatch
create table if not exists public.call_responses (
  id               uuid primary key default gen_random_uuid(),
  latitude         double precision not null,
  longitude        double precision not null,
  label            text not null,
  status           text not null default 'active'
    check (status in ('active', 'closed')),
  closure_outcome  text,
  closure_remarks  text,
  created_at       timestamptz not null default now(),
  created_by       uuid references public."user"(id) on delete set null,
  closed_at        timestamptz,
  closed_by        uuid references public."user"(id) on delete set null
);

create index if not exists call_responses_active_created_idx
  on public.call_responses (created_at desc)
  where status = 'active';

create index if not exists call_responses_closed_created_idx
  on public.call_responses (closed_at desc)
  where status = 'closed';

alter table public.call_responses enable row level security;

-- Realtime updates for dispatch board
alter publication supabase_realtime add table public.call_responses;
