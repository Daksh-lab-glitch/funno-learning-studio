-- Allow each teacher to choose a memorable private studio code. The code is
-- normalized to uppercase and remains protected by the classrooms RLS model.
create or replace function private.set_teacher_studio_code(requested_code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  teacher_user_id uuid := (select auth.uid());
  normalized_code text := upper(trim(requested_code));
  saved_code text;
begin
  if teacher_user_id is null or not exists (
    select 1 from public.user_profiles p
    where p.id = teacher_user_id and p.role = 'teacher'
  ) then
    raise exception 'Sign in with a teacher account to choose a student code.'
      using errcode = '42501';
  end if;

  if normalized_code !~ '^[A-Z0-9]{6,12}$' then
    raise exception 'Use 6 to 12 letters or numbers for your code.'
      using errcode = '22023';
  end if;

  -- Creates a studio on first use and keeps existing teacher content intact.
  perform * from private.ensure_teacher_studio();

  begin
    update public.classrooms c
    set join_code = normalized_code
    where c.id = (
      select owned.id
      from public.classrooms owned
      where owned.teacher_id = teacher_user_id
      order by owned.created_at, owned.id
      limit 1
    )
      and c.teacher_id = teacher_user_id
    returning c.join_code into saved_code;
  exception when unique_violation then
    raise exception 'That code is already in use. Choose a different one.'
      using errcode = '23505';
  end;

  if saved_code is null then
    raise exception 'Your Funno Studio could not be found. Please try again.'
      using errcode = 'P0002';
  end if;

  return saved_code;
end;
$$;

revoke all on function private.set_teacher_studio_code(text) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.set_teacher_studio_code(text) to authenticated;

create or replace function public.set_teacher_studio_code(requested_code text)
returns text
language sql
security invoker
set search_path = ''
as $$
  select private.set_teacher_studio_code(requested_code);
$$;

revoke all on function public.set_teacher_studio_code(text) from public, anon;
grant execute on function public.set_teacher_studio_code(text) to authenticated;

notify pgrst, 'reload schema';
