alter table public.irrigation_commands
  rename column duration_minutes to duration_seconds;

alter table public.irrigation_commands
  drop constraint irrigation_commands_duration_minutes_check,
  add constraint irrigation_commands_duration_seconds_check
    check (duration_seconds between 1 and 120);

grant insert (valve_id, action, duration_seconds, client_request_id)
  on public.irrigation_commands to authenticated;
