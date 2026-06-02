-- Demo patrol account + map marker for monitoring dashboard testing
-- Login (mobile / future Flutter): patrol1@patrol.local / 111111
-- Badge: PATROL1

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
  'patrol1@patrol.local',
  '111111',
  'Patrol One',
  'Pat',
  'PATROL1',
  'Patroller',
  'PRO4A',
  'Alpha Unit'
)
on conflict (badge_number) do update set
  email = excluded.email,
  password = excluded.password,
  full_name = excluded.full_name,
  rank = excluded.rank,
  role = excluded.role,
  office = excluded.office,
  unit = excluded.unit;

insert into public.location_updates (
  user_id,
  latitude,
  longitude,
  accuracy,
  patrol_name,
  badge_number
)
select
  u.id,
  14.676,
  121.0437,
  12,
  coalesce(u.rank_fullname, u.full_name, 'Patrol One'),
  u.badge_number
from public."user" u
where u.badge_number = 'PATROL1';
