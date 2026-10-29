-- Keep definer privileges in the private schema and expose only invoker RPCs.
create or replace function private.request_teacher_role()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'Sign in first'; end if;
  update public.user_profiles set role = 'teacher' where id = (select auth.uid());
  if not found then raise exception 'Profile not found'; end if;
end;
$$;
revoke all on function private.request_teacher_role() from public, anon;
grant execute on function private.request_teacher_role() to authenticated;
create or replace function public.request_teacher_role()
returns void language sql security invoker set search_path = '' as $$
  select private.request_teacher_role();
$$;
revoke all on function public.request_teacher_role() from public, anon;
grant execute on function public.request_teacher_role() to authenticated;

create or replace function private.join_class(invite_code text, learner_name text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  target public.classrooms%rowtype;
  new_student_id bigint;
begin
  if (select auth.uid()) is null then raise exception 'Sign in first'; end if;
  if learner_name is null or char_length(trim(learner_name)) not between 1 and 100 then
    raise exception 'Enter a learner name';
  end if;
  if exists (select 1 from public.students where auth_user_id = (select auth.uid())) then
    raise exception 'This account is already linked to a class';
  end if;
  select * into target from public.classrooms c where c.join_code = upper(trim(invite_code));
  if target.id is null then raise exception 'That class code was not found'; end if;
  if exists (select 1 from public.user_profiles p where p.id = (select auth.uid()) and p.role <> 'student') then
    raise exception 'Teacher accounts cannot join a class as a learner';
  end if;
  insert into public.students(name, attendance, assessment, participation, auth_user_id, classroom_id, grade, course)
  values (trim(learner_name), 0, 0, 0, (select auth.uid()), target.id, target.grade, target.course)
  returning id into new_student_id;
  return new_student_id;
end;
$$;
revoke all on function private.join_class(text, text) from public, anon;
grant execute on function private.join_class(text, text) to authenticated;
create or replace function public.join_class(invite_code text, learner_name text)
returns bigint language sql security invoker set search_path = '' as $$
  select private.join_class(invite_code, learner_name);
$$;
revoke all on function public.join_class(text, text) from public, anon;
grant execute on function public.join_class(text, text) to authenticated;

create or replace function private.my_class_codes()
returns table(classroom_id bigint, join_code text)
language sql stable security definer set search_path = '' as $$
  select c.id, c.join_code from public.classrooms c
  where (select auth.uid()) is not null
    and c.teacher_id = (select auth.uid())
    and (select private.is_teacher())
$$;
revoke all on function private.my_class_codes() from public, anon;
grant execute on function private.my_class_codes() to authenticated;
create or replace function public.my_class_codes()
returns table(classroom_id bigint, join_code text)
language sql stable security invoker set search_path = '' as $$
  select codes.classroom_id, codes.join_code from private.my_class_codes() codes
$$;
revoke all on function public.my_class_codes() from public, anon;
grant execute on function public.my_class_codes() to authenticated;

