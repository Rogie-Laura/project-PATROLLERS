-- P4: Schedule daily pruning of location history (90-day retention).
-- Requires pg_cron (enabled on Supabase Pro).

do $cron$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid)
    from cron.job
    where jobname = 'prune-old-location-updates';

    perform cron.schedule(
      'prune-old-location-updates',
      '0 3 * * *',
      $$select public.prune_old_location_updates(90)$$
    );
  end if;
end;
$cron$;
