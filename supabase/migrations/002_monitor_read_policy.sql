-- Fix: allow monitor dashboard to read patrol locations without login
-- Run this in Supabase SQL Editor if map shows empty but data exists in table

create policy "Public can read locations for monitoring"
  on public.location_updates for select
  using (true);
