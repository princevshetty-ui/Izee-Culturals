create table if not exists public.registration_config (
  id integer primary key default 1 check (id = 1),
  student_open boolean not null default true,
  participant_open boolean not null default true,
  volunteer_open boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.registration_config (id, student_open, participant_open, volunteer_open)
values (1, true, true, true)
on conflict (id) do nothing;
