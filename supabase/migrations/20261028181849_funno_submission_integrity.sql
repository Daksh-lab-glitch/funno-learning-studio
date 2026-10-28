-- Keep submission size, grading bounds, file paths and attendance identity valid
-- even when a client bypasses the classroom interface.

alter table public.submissions
  add constraint submissions_response_length check (char_length(response) <= 5000),
  add constraint submissions_file_path_scope check (file_path is null or file_path like ('submissions/' || student_id::text || '/%'));

alter table public.resources
  add constraint resources_storage_path_scope check (storage_path is null or storage_path like 'resources/%');

create or replace function private.guard_submission_grade()
returns trigger language plpgsql set search_path = ''
as $$
declare
  allowed_points integer;
begin
  if new.grade is not null then
    select a.max_points into allowed_points from public.assignments a where a.id = new.assignment_id;
    if allowed_points is null or new.grade > allowed_points then
      raise exception 'Submission grade exceeds the activity points';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.guard_submission_grade() from public, anon, authenticated;
drop trigger if exists validate_funno_submission_grade on public.submissions;
create trigger validate_funno_submission_grade before insert or update of grade, assignment_id on public.submissions
for each row execute function private.guard_submission_grade();

drop policy if exists attendance_teacher_insert on public.attendance_entries;
create policy attendance_teacher_insert on public.attendance_entries for insert to authenticated
  with check ((select private.is_teacher()) and marked_by = (select auth.uid()));
drop policy if exists attendance_teacher_update on public.attendance_entries;
create policy attendance_teacher_update on public.attendance_entries for update to authenticated
  using ((select private.is_teacher())) with check ((select private.is_teacher()) and marked_by = (select auth.uid()));
