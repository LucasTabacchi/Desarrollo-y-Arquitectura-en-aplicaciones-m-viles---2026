-- Allow operators to cancel their own pending commands (RF-17)
grant update (status) on public.irrigation_commands to authenticated;

create policy "Operators can cancel their own pending commands"
  on public.irrigation_commands for update to authenticated
  using (
    status = 'pending'
    and requested_by = auth.uid()
    and public.can_operate_valve(valve_id)
  )
  with check (
    status = 'cancelled'
  );

-- Add region column to organizations (PRD §9)
alter table public.organizations
  add column if not exists region text;

-- Publish alerts to Realtime so the app can subscribe
alter publication supabase_realtime add table public.alerts;

-- Rename duration_seconds back to duration_minutes if it exists
do $$
begin
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'irrigation_commands' and column_name = 'duration_seconds'
  ) then
    alter table public.irrigation_commands rename column duration_seconds to duration_minutes;
  end if;
end $$;

alter table public.irrigation_commands
  drop constraint if exists irrigation_commands_duration_seconds_check;

alter table public.irrigation_commands
  drop constraint if exists irrigation_commands_duration_minutes_check;

alter table public.irrigation_commands
  add constraint irrigation_commands_duration_minutes_check
    check (duration_minutes between 1 and 120);

-- Re-grant with corrected column name
grant insert (valve_id, action, duration_minutes, client_request_id)
  on public.irrigation_commands to authenticated;
