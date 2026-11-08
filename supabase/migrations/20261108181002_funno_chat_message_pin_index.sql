-- Keep cascading user deletion efficient for conversation pins.
create index if not exists class_message_pins_pinned_by_idx
  on public.class_message_pins (pinned_by);
