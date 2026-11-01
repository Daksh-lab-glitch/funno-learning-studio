-- Let a student submit a teacher-specific code during every sign-in.
-- A code links that student to exactly one teacher's classroom. Re-entering
-- the same teacher code is idempotent; a different teacher code is rejected.
create or replace function private.join_class(invite_code text, learner_name text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target public.classrooms%rowtype;
  existing_student_id bigint;
  existing_classroom_id bigint;
  new_student_id bigint;
  normalized_code text := upper(trim(invite_code));
begin
  if current_user_id is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;

  if normalized_code !~ '^[A-Z0-9]{6,12}$' then
    raise exception 'Enter the 6–12 character code shared by your teacher.'
      using errcode = '22023';
  end if;

  if learner_name is null or char_length(trim(learner_name)) not between 1 and 100 then
    raise exception 'Enter your name.' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.user_profiles p
    where p.id = current_user_id and p.role = 'student'
  ) then
    raise exception 'Only student accounts can join a teacher studio.'
      using errcode = '42501';
  end if;

  select c.* into target
  from public.classrooms c
  where c.join_code = normalized_code;

  if target.id is null then
    raise exception 'That teacher code was not found. Check it with your teacher.'
      using errcode = 'P0002';
  end if;

  select s.id, s.classroom_id
    into existing_student_id, existing_classroom_id
  from public.students s
  where s.auth_user_id = current_user_id
  for update;

  if existing_student_id is not null then
    if existing_classroom_id = target.id then
      return existing_student_id;
    end if;

    raise exception 'This student account is linked to another teacher. Use the matching teacher code or a separate student account.'
      using errcode = '23505';
  end if;

  insert into public.students
    (name, attendance, assessment, participation, auth_user_id, classroom_id, grade, course)
  values
    (trim(learner_name), 0, 0, 0, current_user_id, target.id, target.grade, target.course)
  returning id into new_student_id;

  return new_student_id;
end;
$$;

revoke all on function private.join_class(text, text) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.join_class(text, text) to authenticated;

create or replace function public.join_class(invite_code text, learner_name text)
returns bigint
language sql
security invoker
set search_path = ''
as $$
  select private.join_class(invite_code, learner_name);
$$;

revoke all on function public.join_class(text, text) from public, anon;
grant execute on function public.join_class(text, text) to authenticated;

notify pgrst, 'reload schema';

