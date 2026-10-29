-- Provision one private studio for each teacher. Students enter the teacher's
-- existing private classroom code after sign-in; join_class validates it and
-- attaches the learner so existing classroom-scoped RLS policies unlock only
-- that teacher's activities, quizzes, games, and results.
create or replace function private.ensure_teacher_studio()
returns table (classroom_id bigint, join_code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  institution_key bigint;
  studio_key bigint;
  studio_code text;
begin
  if current_user_id is null or not exists (
    select 1 from public.user_profiles p
    where p.id = current_user_id and p.role = 'teacher'
  ) then
    raise exception 'Only signed-in teacher accounts can create a Funno Studio.'
      using errcode = '42501';
  end if;

  -- Keep existing teacher content and its current verification code.
  select c.id, c.join_code
  into studio_key, studio_code
  from public.classrooms c
  where c.teacher_id = current_user_id
  order by c.created_at, c.id
  limit 1;

  if studio_key is null then
    insert into public.institutions (name, institution_type, created_by)
    values ('Funno Learning Studio', 'other', current_user_id)
    returning id into institution_key;

    insert into public.classrooms
      (institution_id, teacher_id, name, education_level, grade, course)
    values
      (institution_key, current_user_id, 'My activity studio', 'other', null, null)
    returning id, classrooms.join_code into studio_key, studio_code;
  end if;

  return query select studio_key, studio_code;
end;
$$;

revoke all on function private.ensure_teacher_studio() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.ensure_teacher_studio() to authenticated;

create or replace function public.ensure_teacher_studio()
returns table (classroom_id bigint, join_code text)
language sql
security invoker
set search_path = ''
as $$
  select * from private.ensure_teacher_studio();
$$;

revoke all on function public.ensure_teacher_studio() from public, anon;
grant execute on function public.ensure_teacher_studio() to authenticated;

notify pgrst, 'reload schema';
