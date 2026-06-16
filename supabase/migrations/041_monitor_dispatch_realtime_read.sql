-- Allow monitor dashboard (anon Supabase client) to receive Realtime updates
-- for dispatch acknowledgement and incident status on the map.

create policy "Public can read call response dispatches for monitoring"
  on public.call_response_dispatches for select
  using (true);

create policy "Public can read call responses for monitoring"
  on public.call_responses for select
  using (true);
