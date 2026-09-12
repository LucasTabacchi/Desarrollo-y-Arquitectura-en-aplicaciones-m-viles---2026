create function public.apply_irrigation_command(target_command_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  command_record record;
begin
  select id, valve_id, action
    into command_record
    from public.irrigation_commands
   where id = target_command_id
     and status = 'pending'
   for update;

  if not found then
    return false;
  end if;

  update public.valves
     set state = case command_record.action
       when 'open' then 'open'::public.valve_state
       when 'close' then 'closed'::public.valve_state
     end
   where id = command_record.valve_id;

  if not found then
    raise exception 'Valve for irrigation command was not found';
  end if;

  update public.irrigation_commands
     set status = 'applied', applied_at = now()
   where id = command_record.id;

  return true;
end;
$$;

revoke all on function public.apply_irrigation_command(uuid) from public, anon, authenticated;
grant execute on function public.apply_irrigation_command(uuid) to service_role;
