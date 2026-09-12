create extension if not exists pgcrypto with schema extensions;

create type public.membership_role as enum ('producer', 'operator', 'advisor');
create type public.reading_source as enum ('sensor', 'manual');
create type public.valve_state as enum ('open', 'closed');
create type public.irrigation_action as enum ('open', 'close');
create type public.irrigation_command_status as enum ('pending', 'applied', 'failed', 'cancelled');

create function public.is_valid_geojson_polygon(value jsonb)
returns boolean
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  ring jsonb;
  point jsonb;
begin
  if jsonb_typeof(value) <> 'object'
    or value ->> 'type' <> 'Polygon'
    or jsonb_typeof(value -> 'coordinates') <> 'array'
    or jsonb_array_length(value -> 'coordinates') = 0 then
    return false;
  end if;

  for ring in select jsonb_array_elements(value -> 'coordinates') loop
    if jsonb_typeof(ring) <> 'array'
      or jsonb_array_length(ring) < 4
      or ring -> 0 <> ring -> (jsonb_array_length(ring) - 1) then
      return false;
    end if;

    for point in select jsonb_array_elements(ring) loop
      if jsonb_typeof(point) <> 'array'
        or jsonb_array_length(point) < 2
        or jsonb_typeof(point -> 0) <> 'number'
        or jsonb_typeof(point -> 1) <> 'number' then
        return false;
      end if;
    end loop;
  end loop;

  return true;
end;
$$;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.membership_role not null,
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.plots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  crop text,
  boundary jsonb not null check (public.is_valid_geojson_polygon(boundary)),
  threshold_min numeric(5,2) not null default 25.00 check (threshold_min between 0 and 100),
  threshold_max numeric(5,2) not null default 45.00 check (threshold_max between 0 and 100),
  created_at timestamptz not null default now(),
  check (threshold_min < threshold_max),
  unique (organization_id, name)
);

create table public.stations (
  id uuid primary key default gen_random_uuid(),
  plot_id uuid not null references public.plots(id) on delete cascade,
  name text not null,
  external_id text,
  created_at timestamptz not null default now(),
  unique (plot_id, name),
  unique (external_id)
);

create table public.readings (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  measured_at timestamptz not null,
  source public.reading_source not null,
  soil_moisture_pct numeric(5,2) not null check (soil_moisture_pct between 0 and 100),
  air_temperature_c numeric(5,2),
  created_at timestamptz not null default now(),
  unique (station_id, measured_at)
);

create index readings_station_measured_at_desc_idx
  on public.readings (station_id, measured_at desc);

create table public.valves (
  id uuid primary key default gen_random_uuid(),
  plot_id uuid not null references public.plots(id) on delete cascade,
  station_id uuid references public.stations(id) on delete set null,
  name text not null,
  state public.valve_state not null default 'closed',
  created_at timestamptz not null default now(),
  unique (plot_id, name)
);

create table public.irrigation_commands (
  id uuid primary key default gen_random_uuid(),
  valve_id uuid not null references public.valves(id) on delete cascade,
  action public.irrigation_action not null,
  duration_minutes smallint not null check (duration_minutes between 1 and 120),
  status public.irrigation_command_status not null default 'pending',
  client_request_id uuid not null unique,
  requested_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  applied_at timestamptz
);

create unique index irrigation_commands_one_pending_per_valve_idx
  on public.irrigation_commands (valve_id)
  where status = 'pending';

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  plot_id uuid not null references public.plots(id) on delete cascade,
  message text not null,
  severity text not null check (severity in ('info', 'warning', 'critical')),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships
    where organization_id = target_organization_id
      and user_id = auth.uid()
  );
$$;

create function public.can_operate_organization(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships
    where organization_id = target_organization_id
      and user_id = auth.uid()
      and role in ('producer', 'operator')
  );
$$;

create function public.is_plot_organization_member(target_plot_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_organization_member(organization_id)
  from public.plots
  where id = target_plot_id;
$$;

create function public.is_station_organization_member(target_station_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_plot_organization_member(plot_id)
  from public.stations
  where id = target_station_id;
$$;

create function public.can_operate_station(target_station_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.can_operate_organization(plots.organization_id)
  from public.stations
  join public.plots on plots.id = stations.plot_id
  where stations.id = target_station_id;
$$;

create function public.is_valve_organization_member(target_valve_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_plot_organization_member(plot_id)
  from public.valves
  where id = target_valve_id;
$$;

create function public.can_operate_valve(target_valve_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.can_operate_organization(plots.organization_id)
  from public.valves
  join public.plots on plots.id = valves.plot_id
  where valves.id = target_valve_id;
$$;

alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.plots enable row level security;
alter table public.stations enable row level security;
alter table public.readings enable row level security;
alter table public.valves enable row level security;
alter table public.irrigation_commands enable row level security;
alter table public.alerts enable row level security;

create policy "Organization members can read their organization"
  on public.organizations for select to authenticated
  using (public.is_organization_member(id));

create policy "Organization members can read memberships"
  on public.memberships for select to authenticated
  using (public.is_organization_member(organization_id));

create policy "Organization members can read plots"
  on public.plots for select to authenticated
  using (public.is_organization_member(organization_id));

create policy "Operators can update plot thresholds"
  on public.plots for update to authenticated
  using (public.can_operate_organization(organization_id))
  with check (public.can_operate_organization(organization_id));

create policy "Organization members can read stations"
  on public.stations for select to authenticated
  using (public.is_plot_organization_member(plot_id));

create policy "Organization members can read readings"
  on public.readings for select to authenticated
  using (public.is_station_organization_member(station_id));

create policy "Operators can create manual readings"
  on public.readings for insert to authenticated
  with check (source = 'manual' and public.can_operate_station(station_id));

create policy "Organization members can read valves"
  on public.valves for select to authenticated
  using (public.is_plot_organization_member(plot_id));

create policy "Organization members can read irrigation commands"
  on public.irrigation_commands for select to authenticated
  using (public.is_valve_organization_member(valve_id));

create policy "Operators can create irrigation commands"
  on public.irrigation_commands for insert to authenticated
  with check (
    public.can_operate_valve(valve_id)
    and requested_by = auth.uid()
    and status = 'pending'
  );

create policy "Organization members can read alerts"
  on public.alerts for select to authenticated
  using (public.is_plot_organization_member(plot_id));

revoke all on table public.organizations, public.memberships, public.plots,
  public.stations, public.readings, public.valves, public.irrigation_commands,
  public.alerts from anon, authenticated;

grant usage on schema public to authenticated;
grant select on table public.organizations, public.memberships, public.plots,
  public.stations, public.readings, public.valves, public.irrigation_commands,
  public.alerts to authenticated;
grant update (threshold_min, threshold_max) on public.plots to authenticated;
grant insert (station_id, measured_at, source, soil_moisture_pct, air_temperature_c)
  on public.readings to authenticated;
grant insert (valve_id, action, duration_minutes, client_request_id)
  on public.irrigation_commands to authenticated;

revoke all on function public.is_organization_member(uuid),
  public.can_operate_organization(uuid), public.is_plot_organization_member(uuid),
  public.is_station_organization_member(uuid), public.can_operate_station(uuid),
  public.is_valve_organization_member(uuid), public.can_operate_valve(uuid) from public;
grant execute on function public.is_organization_member(uuid),
  public.can_operate_organization(uuid), public.is_plot_organization_member(uuid),
  public.is_station_organization_member(uuid), public.can_operate_station(uuid),
  public.is_valve_organization_member(uuid), public.can_operate_valve(uuid) to authenticated;

alter publication supabase_realtime add table public.readings;
alter publication supabase_realtime add table public.valves;
alter publication supabase_realtime add table public.irrigation_commands;
