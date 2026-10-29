-- Avoid the classrooms -> institutions -> classrooms RLS policy cycle during
-- class creation. The helper runs as the table owner and checks institution
-- ownership without invoking institutions' row policies.
create or replace function private.owns_institution(target_institution_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.institutions i
    where i.id = target_institution_id
      and i.created_by = (select auth.uid())
  );
$$;

revoke all on function private.owns_institution(bigint) from public, anon;
grant execute on function private.owns_institution(bigint) to authenticated;

drop policy if exists classrooms_teacher_insert on public.classrooms;
create policy classrooms_teacher_insert on public.classrooms
for insert to authenticated
with check (
  (select private.is_teacher())
  and teacher_id = (select auth.uid())
  and (select private.owns_institution(classrooms.institution_id))
);

-- Normalize the original seed class and enforce the school-grade range.
update public.classrooms
set grade = 'Grade 1'
where education_level = 'school'
  and lower(trim(grade)) in ('class 1', '1', '1st grade');

update public.students s
set grade = c.grade
from public.classrooms c
where s.classroom_id = c.id
  and c.education_level = 'school'
  and s.grade is distinct from c.grade
  and lower(trim(coalesce(s.grade, ''))) in ('class 1', '1', '1st grade');

alter table public.classrooms
  drop constraint if exists classrooms_school_grade_range_check;
alter table public.classrooms
  add constraint classrooms_school_grade_range_check
  check (
    education_level <> 'school'
    or grade = any (array[
      'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
      'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'
    ]::text[])
  );

notify pgrst, 'reload schema';
