-- Cover foreign keys used by joins and row ownership checks.
create index announcements_created_by_idx on public.announcements(created_by);
create index attendance_marked_by_idx on public.attendance_entries(marked_by);
create index class_messages_classroom_id_idx on public.class_messages(classroom_id);
create index class_messages_sender_id_idx on public.class_messages(sender_id);
create index fun_activity_results_classroom_id_idx on public.fun_activity_results(classroom_id);
create index institutions_created_by_idx on public.institutions(created_by);
create index quiz_answer_keys_classroom_id_idx on public.quiz_answer_keys(classroom_id);
create index quiz_answer_keys_created_by_idx on public.quiz_answer_keys(created_by);

-- The original submissions table already has the same unique constraint. Keep
-- that index and remove the later duplicate introduced by the earlier addon.
drop index if exists public.submissions_assignment_student_unique;

-- One UPDATE policy covers both teacher review and student edits, with the
-- appropriate row and classroom checks on each side of the update.
drop policy if exists submissions_teacher_update on public.submissions;
drop policy if exists submissions_update_own_ungraded on public.submissions;
create policy submissions_update_scoped on public.submissions for update to authenticated
  using (exists (
    select 1 from public.students s where s.id = student_id and s.name = student_name
      and ((select private.owns_classroom(s.classroom_id))
        or (s.auth_user_id = (select auth.uid()) and submissions.grade is null and submissions.teacher_feedback is null and submissions.status = 'submitted'))
  ))
  with check (exists (
    select 1 from public.students s where s.id = student_id and s.name = student_name
      and exists (select 1 from public.assignments a where a.id = assignment_id and a.classroom_id = s.classroom_id)
      and ((select private.owns_classroom(s.classroom_id))
        or (s.auth_user_id = (select auth.uid()) and submissions.grade is null and submissions.teacher_feedback is null and submissions.graded_at is null and submissions.status = 'submitted'))
  ));

