-- Command center roles: RCC, PCC, SCC (+ legacy phq/stn during transition)

alter table public."user" drop constraint if exists user_role_check;

alter table public."user"
  add constraint user_role_check
  check (
    role in (
      'Patroller',
      'stn',
      'phq',
      'RCC',
      'PCC',
      'SCC',
      'System Administrator'
    )
  );

update public."user"
set role = 'PCC'
where role = 'phq';

update public."user"
set role = 'SCC'
where role = 'stn';
