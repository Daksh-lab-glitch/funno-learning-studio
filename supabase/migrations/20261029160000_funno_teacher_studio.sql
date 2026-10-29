-- Extend classroom assignments into teacher-published activities with
-- class-private supporting files. This runs after the multi-class migration,
-- which adds classroom_id and classroom-scoped row-level security.
alter table public.assignments
  add column if not exists activity_type text not null default 'assignment',
  add column if not exists attachment_path text,
  add column if not exists file_name text,
  add column if not exists file_size_bytes bigint;

alter table public.assignments
  add constraint assignments_activity_type_check
    check (activity_type in ('assignment', 'project', 'discussion', 'fun_challenge')),
  add constraint assignments_attachment_class_path_check
    check (attachment_path is null or attachment_path like ('resources/' || classroom_id::text || '/assignments/%')),
  add constraint assignments_attachment_size_check
    check (file_size_bytes is null or file_size_bytes between 1 and 10485760);

notify pgrst, 'reload schema';
