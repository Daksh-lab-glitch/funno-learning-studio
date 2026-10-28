-- Index lookup keys on foreign keys used by row-level security and account mapping.
create index resources_created_by_idx on public.resources(created_by);
create index assignments_created_by_idx on public.assignments(created_by);
create index quizzes_created_by_idx on public.quizzes(created_by);
create index feedback_user_id_idx on public.feedback(user_id);
create index quiz_results_quiz_id_idx on public.quiz_results(quiz_id);

-- This pre-existing helper is called by the database event trigger. It should not
-- be callable as a public PostgREST RPC under its SECURITY DEFINER privileges.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
