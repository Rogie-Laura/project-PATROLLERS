-- Admin report: tokens with competing GPS sources (likely shared token / dual phones).

create or replace function public.get_token_conflict_report(
  p_days integer default 7,
  p_min_conflict_minutes integer default 5
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_days integer := greatest(1, least(30, coalesce(p_days, 7)));
  v_min integer := greatest(1, least(120, coalesce(p_min_conflict_minutes, 5)));
  v_since timestamptz := now() - make_interval(days => v_days);
begin
  return coalesce(
    (
      with recent as (
        select
          lu.access_token_id,
          lu.created_at,
          lu.latitude,
          lu.longitude,
          lu.accuracy,
          lu.signal_label,
          date_trunc('minute', lu.created_at) as minute_bucket,
          round(lu.latitude::numeric, 2) as lat_bucket,
          round(lu.longitude::numeric, 2) as lng_bucket
        from public.location_updates lu
        where lu.created_at >= v_since
          and coalesce(lu.tracking_active, true) = true
          and lu.access_token_id is not null
      ),
      minute_conflicts as (
        select
          access_token_id,
          minute_bucket,
          count(*) as pings_in_minute,
          count(distinct lat_bucket || ',' || lng_bucket) as distinct_spots
        from recent
        group by access_token_id, minute_bucket
        having count(*) >= 2
          and count(distinct lat_bucket || ',' || lng_bucket) >= 2
      ),
      conflict_summary as (
        select
          access_token_id,
          count(*)::integer as conflict_minutes,
          max(pings_in_minute)::integer as max_pings_same_minute
        from minute_conflicts
        group by access_token_id
        having count(*) >= v_min
      ),
      cluster_counts as (
        select
          access_token_id,
          count(distinct lat_bucket || ',' || lng_bucket)::integer as distinct_spot_clusters
        from recent
        where access_token_id in (select access_token_id from conflict_summary)
        group by access_token_id
      ),
      ordered as (
        select
          r.access_token_id,
          r.created_at,
          r.latitude,
          r.longitude,
          lag(r.latitude) over (
            partition by r.access_token_id
            order by r.created_at
          ) as prev_lat,
          lag(r.longitude) over (
            partition by r.access_token_id
            order by r.created_at
          ) as prev_lng
        from recent r
        where r.access_token_id in (select access_token_id from conflict_summary)
      ),
      jump_summary as (
        select
          access_token_id,
          count(*) filter (
            where prev_lat is not null
              and (
                6371000 * acos(
                  least(
                    1,
                    greatest(
                      -1,
                      cos(radians(prev_lat)) * cos(radians(latitude))
                        * cos(radians(longitude) - radians(prev_lng))
                      + sin(radians(prev_lat)) * sin(radians(latitude))
                    )
                  )
                )
              ) > 5000
          )::integer as large_jumps_5km,
          count(*)::integer as total_pings
        from ordered
        group by access_token_id
      ),
      spot_stats as (
        select
          r.access_token_id,
          r.lat_bucket,
          r.lng_bucket,
          count(*)::integer as pings,
          round(avg(r.accuracy)::numeric, 0) as avg_accuracy_m,
          mode() within group (order by nullif(trim(r.signal_label), '')) as common_signal,
          max(r.created_at) as last_ping_at
        from recent r
        where r.access_token_id in (select access_token_id from conflict_summary)
        group by r.access_token_id, r.lat_bucket, r.lng_bucket
      ),
      top_spots as (
        select
          access_token_id,
          jsonb_agg(
            jsonb_build_object(
              'latitude', lat_bucket,
              'longitude', lng_bucket,
              'pings', pings,
              'avg_accuracy_m', avg_accuracy_m,
              'common_signal', coalesce(common_signal, 'Unknown'),
              'last_ping_at', last_ping_at
            )
            order by pings desc
          ) as spots
        from (
          select
            ss.*,
            row_number() over (
              partition by ss.access_token_id
              order by ss.pings desc
            ) as rn
          from spot_stats ss
        ) ranked
        where rn <= 3
        group by access_token_id
      )
      select jsonb_agg(row_data order by (row_data->>'conflict_minutes')::int desc)
      from (
        select jsonb_build_object(
          'access_token_id', t.id,
          'token', t.token,
          'label', t.label,
          'is_active', t.is_active,
          'mobile_plate', p.mobile_plate,
          'office', p.office,
          'unit', p.unit,
          'radio_call_sign', p.radio_call_sign,
          'mobile_phone', p.mobile_phone,
          'is_device_bound', p.bound_device_id is not null,
          'bound_device_id', p.bound_device_id,
          'live_tracking_active', coalesce(p.live_tracking_active, false),
          'last_seen_at', p.last_seen_at,
          'conflict_minutes', cs.conflict_minutes,
          'max_pings_same_minute', cs.max_pings_same_minute,
          'distinct_spot_clusters', cc.distinct_spot_clusters,
          'large_jumps_5km', coalesce(js.large_jumps_5km, 0),
          'total_pings', coalesce(js.total_pings, 0),
          'jump_pct',
            case
              when coalesce(js.total_pings, 0) = 0 then 0
              else round(
                100.0 * coalesce(js.large_jumps_5km, 0) / js.total_pings,
                1
              )
            end,
          'spots', coalesce(ts.spots, '[]'::jsonb)
        ) as row_data
        from conflict_summary cs
        join cluster_counts cc on cc.access_token_id = cs.access_token_id
        join public.access_tokens t on t.id = cs.access_token_id
        left join public.mobile_device_profiles p on p.access_token_id = t.id
        left join jump_summary js on js.access_token_id = cs.access_token_id
        left join top_spots ts on ts.access_token_id = cs.access_token_id
      ) report_rows
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.get_token_conflict_report(integer, integer) from public;
grant execute on function public.get_token_conflict_report(integer, integer) to anon, authenticated;
