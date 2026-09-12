-- ====================================================================
-- AgroPulse: Complete Setup Script (Remaining Migrations + Seed Data)
-- Run this in Supabase SQL Editor after 20260902210000_initial_agropulse_schema.sql
-- ====================================================================

-- 1. Atomic irrigation command function
create or replace function public.apply_irrigation_command(target_command_id uuid)
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

-- 2. Weather readings and worker diagnostics
create table if not exists public.weather_readings (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  station_external_id text not null,
  measured_at timestamptz not null,
  rainfall_mm numeric(7,2) not null check (rainfall_mm >= 0),
  event_id uuid not null unique,
  created_at timestamptz not null default now(),
  unique (station_id, measured_at)
);

create index if not exists weather_readings_station_measured_at_desc_idx on public.weather_readings (station_id, measured_at desc);

create table if not exists public.worker_heartbeats (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  worker_name text not null,
  last_tick_at timestamptz not null,
  last_consumed_at timestamptz not null,
  last_event_type text not null check (last_event_type in ('soil.moisture', 'weather.tick')),
  status text not null default 'healthy' check (status in ('healthy', 'stale')),
  updated_at timestamptz not null default now(),
  primary key (organization_id, worker_name)
);

alter table public.weather_readings enable row level security;
alter table public.worker_heartbeats enable row level security;

drop policy if exists "Organization members can read weather readings" on public.weather_readings;
create policy "Organization members can read weather readings" on public.weather_readings
  for select to authenticated using (public.is_station_organization_member(station_id));

drop policy if exists "Organization members can read worker heartbeats" on public.worker_heartbeats;
create policy "Organization members can read worker heartbeats" on public.worker_heartbeats
  for select to authenticated using (public.is_organization_member(organization_id));

revoke all on table public.weather_readings, public.worker_heartbeats from anon, authenticated;
grant select on table public.weather_readings, public.worker_heartbeats to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'weather_readings'
  ) then
    alter publication supabase_realtime add table public.weather_readings;
  end if;
end $$;

-- 3. Command cancellation, alerts in Realtime, region
grant update (status) on public.irrigation_commands to authenticated;

drop policy if exists "Operators can cancel their own pending commands" on public.irrigation_commands;
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

alter table public.organizations
  add column if not exists region text;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'alerts'
  ) then
    alter publication supabase_realtime add table public.alerts;
  end if;
end $$;

grant insert (valve_id, action, duration_minutes, client_request_id)
  on public.irrigation_commands to authenticated;

-- 4. Plot creation and edition policies (RF-07)
grant insert, update on public.plots to authenticated;

drop policy if exists "Producers and operators can insert plots in their organization" on public.plots;
create policy "Producers and operators can insert plots in their organization"
  on public.plots for insert to authenticated
  with check (
    public.is_organization_member(organization_id)
    and exists (
      select 1 from public.memberships
       where organization_id = plots.organization_id
         and user_id = auth.uid()
         and role in ('producer', 'operator')
    )
  );

drop policy if exists "Producers and operators can update plots in their organization" on public.plots;
create policy "Producers and operators can update plots in their organization"
  on public.plots for update to authenticated
  using (
    public.is_organization_member(organization_id)
    and exists (
      select 1 from public.memberships
       where organization_id = plots.organization_id
         and user_id = auth.uid()
         and role in ('producer', 'operator')
    )
  )
  with check (
    public.is_organization_member(organization_id)
    and exists (
      select 1 from public.memberships
       where organization_id = plots.organization_id
         and user_id = auth.uid()
         and role in ('producer', 'operator')
    )
  );

-- 5. Seed Data (Users, Organization, Plots, Stations, Valves, Readings, Alerts)
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'productor@agropulse.test', extensions.crypt('AgroPulseTest!2026', extensions.gen_salt('bf')), now(), '', '', '', '', '{"provider":"email","providers":["email"]}', '{"name":"Test Producer"}', now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'operador@agropulse.test', extensions.crypt('AgroPulseTest!2026', extensions.gen_salt('bf')), now(), '', '', '', '', '{"provider":"email","providers":["email"]}', '{"name":"Test Operator"}', now(), now()),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'asesor@agropulse.test', extensions.crypt('AgroPulseTest!2026', extensions.gen_salt('bf')), now(), '', '', '', '', '{"provider":"email","providers":["email"]}', '{"name":"Test Advisor"}', now(), now()),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'outsider@agropulse.test', extensions.crypt('AgroPulseTest!2026', extensions.gen_salt('bf')), now(), '', '', '', '', '{"provider":"email","providers":["email"]}', '{"name":"Test Outsider"}', now(), now())
on conflict (id) do update set
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  updated_at = excluded.updated_at;

insert into auth.identities (
  id, user_id, identity_data, provider, provider_id, created_at, updated_at
) values
  ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '{"sub":"11111111-1111-1111-1111-111111111111","email":"productor@agropulse.test"}', 'email', 'productor@agropulse.test', now(), now()),
  ('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '{"sub":"22222222-2222-2222-2222-222222222222","email":"operador@agropulse.test"}', 'email', 'operador@agropulse.test', now(), now()),
  ('33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', '{"sub":"33333333-3333-3333-3333-333333333333","email":"asesor@agropulse.test"}', 'email', 'asesor@agropulse.test', now(), now()),
  ('44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', '{"sub":"44444444-4444-4444-4444-444444444444","email":"outsider@agropulse.test"}', 'email', 'outsider@agropulse.test', now(), now())
on conflict (id) do update set
  identity_data = excluded.identity_data,
  updated_at = excluded.updated_at;

insert into public.organizations (id, name, region)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Estancia Didáctica Concordia', 'Concordia, Entre Ríos'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Granja de Pruebas Aislada', null)
on conflict (id) do update set
  name = excluded.name,
  region = excluded.region;

insert into public.memberships (organization_id, user_id, role)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'producer'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'operator'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'advisor'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '44444444-4444-4444-4444-444444444444', 'advisor')
on conflict (organization_id, user_id) do update set
  role = excluded.role;

insert into public.plots (id, organization_id, name, crop, boundary, threshold_min, threshold_max)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Costa 1', 'Citrus', '{"type":"Polygon","coordinates":[[[-58.3980,-31.3920],[-58.3970,-31.3920],[-58.3970,-31.3910],[-58.3980,-31.3910],[-58.3980,-31.3920]]]}', 25, 45),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Costa 2', 'Citrus', '{"type":"Polygon","coordinates":[[[-58.3968,-31.3920],[-58.3958,-31.3920],[-58.3958,-31.3910],[-58.3968,-31.3910],[-58.3968,-31.3920]]]}', 25, 45),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Monte A', 'Soja', '{"type":"Polygon","coordinates":[[[-58.3980,-31.3908],[-58.3970,-31.3908],[-58.3970,-31.3898],[-58.3980,-31.3898],[-58.3980,-31.3908]]]}', 25, 45)
on conflict (id) do update set
  name = excluded.name,
  crop = excluded.crop,
  boundary = excluded.boundary,
  threshold_min = excluded.threshold_min,
  threshold_max = excluded.threshold_max;

insert into public.stations (id, plot_id, name, external_id)
values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'Costa 1 Station', 'local-costa-1'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'Costa 2 Station', 'local-costa-2'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'Monte A Station', 'local-monte-a')
on conflict (id) do update set
  name = excluded.name,
  external_id = excluded.external_id;

insert into public.valves (id, plot_id, station_id, name, state)
values
  ('cccccccc-cccc-cccc-cccc-ccccccccccc1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'Costa 1 Valve', 'closed'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 'Costa 2 Valve', 'open'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc3', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3', 'Monte A Valve', 'closed')
on conflict (id) do update set
  name = excluded.name,
  state = excluded.state;

insert into public.readings (station_id, measured_at, source, soil_moisture_pct, air_temperature_c)
select
  station.id,
  now() - sample.age,
  'sensor',
  sample.moisture,
  sample.temperature
from (
  values
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid, interval '5 hours 30 minutes', 37.5::numeric, 23.2::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid, interval '5 hours', 37.8::numeric, 23.8::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid, interval '4 hours 30 minutes', 38.1::numeric, 24.4::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid, interval '4 hours', 38.0::numeric, 25.1::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid, interval '3 hours 30 minutes', 37.7::numeric, 25.7::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid, interval '3 hours', 37.4::numeric, 26.0::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid, interval '2 hours 30 minutes', 37.2::numeric, 26.3::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid, interval '2 hours', 37.4::numeric, 26.5::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid, interval '1 hour 30 minutes', 37.7::numeric, 26.3::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid, interval '1 hour', 37.9::numeric, 25.9::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid, interval '30 minutes', 38.0::numeric, 25.4::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid, interval '0 minutes', 37.8::numeric, 24.9::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid, interval '5 hours 30 minutes', 22.1::numeric, 23.1::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid, interval '5 hours', 21.8::numeric, 23.7::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid, interval '4 hours 30 minutes', 21.4::numeric, 24.3::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid, interval '4 hours', 21.0::numeric, 25.0::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid, interval '3 hours 30 minutes', 20.7::numeric, 25.6::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid, interval '3 hours', 20.3::numeric, 25.9::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid, interval '2 hours 30 minutes', 19.9::numeric, 26.2::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid, interval '2 hours', 19.7::numeric, 26.4::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid, interval '1 hour 30 minutes', 19.4::numeric, 26.1::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid, interval '1 hour', 19.1::numeric, 25.7::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid, interval '30 minutes', 18.9::numeric, 25.2::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid, interval '0 minutes', 18.7::numeric, 24.8::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid, interval '5 hours 45 minutes', 31.5::numeric, 22.4::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid, interval '5 hours 30 minutes', 31.3::numeric, 23.0::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid, interval '5 hours 15 minutes', 31.0::numeric, 23.7::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid, interval '5 hours', 30.8::numeric, 24.3::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid, interval '4 hours 45 minutes', 30.5::numeric, 24.8::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid, interval '4 hours 30 minutes', 30.2::numeric, 25.2::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid, interval '4 hours 15 minutes', 30.0::numeric, 25.7::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid, interval '4 hours', 29.8::numeric, 25.9::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid, interval '3 hours 45 minutes', 29.6::numeric, 25.6::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid, interval '3 hours 30 minutes', 29.5::numeric, 25.1::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid, interval '3 hours 15 minutes', 29.3::numeric, 24.7::numeric),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid, interval '3 hours', 29.2::numeric, 24.3::numeric)
  ) as sample(station_id, age, moisture, temperature)
join public.stations as station on station.id = sample.station_id
on conflict do nothing;

insert into public.alerts (plot_id, message, severity)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'La humedad del suelo está por debajo del umbral mínimo configurado.', 'warning');
