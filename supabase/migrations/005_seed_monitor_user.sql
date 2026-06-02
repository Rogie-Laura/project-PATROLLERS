-- Seed default monitor login (run after 004_email_login.sql)
-- Email: rjl11@gmail.com  |  Password: 111111

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
