-- Allow each authenticated participant to edit/delete only messages they sent.
alter table public.class_messages
  add column if not exists edited_at timestamptz;

create or replace function private.mark_class_message_edited()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.body is distinct from old.body then
    new.edited_at := now();
  end if;
  return new;
end;
$$;

revoke all on function private.mark_class_message_edited() from public, anon, authenticated;

drop trigger if exists class_messages_mark_edited on public.class_messages;
create trigger class_messages_mark_edited
before update of body on public.class_messages
for each row execute function private.mark_class_message_edited();

create policy class_messages_update_own_thread on public.class_messages
for update to authenticated
using (
  sender_id = (select auth.uid())
  and classroom_id = (select s.classroom_id from public.students s where s.id = student_id)
  and ((select private.owns_classroom(classroom_id)) or student_id in (
    select s.id from public.students s where s.auth_user_id = (select auth.uid())
  ))
)
with check (
  sender_id = (select auth.uid())
  and classroom_id = (select s.classroom_id from public.students s where s.id = student_id)
  and ((select private.owns_classroom(classroom_id)) or student_id in (
    select s.id from public.students s where s.auth_user_id = (select auth.uid())
  ))
);

create policy class_messages_delete_own_thread on public.class_messages
for delete to authenticated
using (
  sender_id = (select auth.uid())
  and classroom_id = (select s.classroom_id from public.students s where s.id = student_id)
  and ((select private.owns_classroom(classroom_id)) or student_id in (
    select s.id from public.students s where s.auth_user_id = (select auth.uid())
  ))
);

grant update (body) on public.class_messages to authenticated;
grant delete on public.class_messages to authenticated;
revoke update, delete on public.class_messages from public, anon;

-- A single pin is shared with the other participant in the private conversation.
create table if not exists public.class_message_pins (
  message_id bigint primary key references public.class_messages(id) on delete cascade,
  pinned_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.class_message_pins enable row level security;

create policy class_message_pins_read_thread on public.class_message_pins
for select to authenticated
using (exists (
  select 1 from public.class_messages m where m.id = message_id
));

create policy class_message_pins_add_thread on public.class_message_pins
for insert to authenticated
with check (
  pinned_by = (select auth.uid())
  and exists (select 1 from public.class_messages m where m.id = message_id)
);

create policy class_message_pins_remove_thread on public.class_message_pins
for delete to authenticated
using (exists (
  select 1 from public.class_messages m where m.id = message_id
));

grant select, insert, delete on public.class_message_pins to authenticated;
revoke all on public.class_message_pins from public, anon;
