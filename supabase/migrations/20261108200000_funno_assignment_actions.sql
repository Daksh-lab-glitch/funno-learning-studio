-- Persist activity pins and keep pin management scoped to the activity's teacher.
create table if not exists public.assignment_pins (
  assignment_id bigint primary key references public.assignments(id) on delete cascade,
  pinned_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists assignment_pins_pinned_by_idx
  on public.assignment_pins (pinned_by);

alter table public.assignment_pins enable row level security;

create policy assignment_pins_read_class on public.assignment_pins
for select to authenticated
using (exists (
  select 1 from public.assignments a where a.id = assignment_id
));

create policy assignment_pins_add_teacher on public.assignment_pins
for insert to authenticated
with check (
  pinned_by = (select auth.uid())
  and exists (
    select 1 from public.assignments a
    where a.id = assignment_id
      and (select private.owns_classroom(a.classroom_id))
  )
);

create policy assignment_pins_remove_teacher on public.assignment_pins
for delete to authenticated
using (exists (
  select 1 from public.assignments a
  where a.id = assignment_id
    and (select private.owns_classroom(a.classroom_id))
));

grant select, insert, delete on public.assignment_pins to authenticated;
revoke all on public.assignment_pins from public, anon;
