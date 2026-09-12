create table public.weather_readings (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  station_external_id text not null,
  measured_at timestamptz not null,
  rainfall_mm numeric(7,2) not null check (rainfall_mm >= 0),
  event_id uuid not null unique,
  created_at timestamptz not null default now(),
  unique (station_id, measured_at)
);

create index weather_readings_station_measured_at_desc_idx on public.weather_readings (station_id, measured_at desc);

create table public.worker_heartbeats (
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

create policy "Organization members can read weather readings" on public.weather_readings
  for select to authenticated using (public.is_station_organization_member(station_id));
create policy "Organization members can read worker heartbeats" on public.worker_heartbeats
  for select to authenticated using (public.is_organization_member(organization_id));

revoke all on table public.weather_readings, public.worker_heartbeats from anon, authenticated;
grant select on table public.weather_readings, public.worker_heartbeats to authenticated;
alter publication supabase_realtime add table public.weather_readings;
