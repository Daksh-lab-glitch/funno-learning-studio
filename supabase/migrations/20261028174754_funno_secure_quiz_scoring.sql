-- Keep answer keys out of the student-readable quiz payload. The Edge Function
-- validates the signed-in learner and writes the computed result.
create table public.quiz_answer_keys (
  quiz_id bigint primary key references public.quizzes(id) on delete cascade,
  answers jsonb not null check (jsonb_typeof(answers) = 'array' and jsonb_array_length(answers) between 1 and 20),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.quiz_answer_keys enable row level security;
create policy quiz_answer_keys_teacher_read on public.quiz_answer_keys for select to authenticated using ((select private.is_teacher()));
create policy quiz_answer_keys_teacher_insert on public.quiz_answer_keys for insert to authenticated with check ((select private.is_teacher()));
create policy quiz_answer_keys_teacher_update on public.quiz_answer_keys for update to authenticated using ((select private.is_teacher())) with check ((select private.is_teacher()));
create policy quiz_answer_keys_teacher_delete on public.quiz_answer_keys for delete to authenticated using ((select private.is_teacher()));
grant select, insert, update, delete on public.quiz_answer_keys to authenticated;
revoke all on public.quiz_answer_keys from anon;

drop policy if exists quiz_results_insert_own on public.quiz_results;
create policy quiz_results_teacher_insert on public.quiz_results for insert to authenticated with check ((select private.is_teacher()));
