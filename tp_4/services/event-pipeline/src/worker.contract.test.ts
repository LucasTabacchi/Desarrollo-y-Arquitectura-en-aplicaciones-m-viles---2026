import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const here = dirname(fileURLToPath(import.meta.url));
const workerSource = readFileSync(join(here, 'worker.ts'), 'utf8');
const migrationSource = readFileSync(join(here, '../../../supabase/migrations/20260907210000_atomic_irrigation_command.sql'), 'utf8');
const schemaSource = readFileSync(join(here, '../../../supabase/migrations/20260902210000_initial_agropulse_schema.sql'), 'utf8');
const durationMigrationSource = readFileSync(join(here, '../../../supabase/migrations/20260907220000_rename_irrigation_duration_to_seconds.sql'), 'utf8');
const insertGrantMigrationSource = readFileSync(join(here, '../../../supabase/migrations/20260907230000_grant_irrigation_command_insert.sql'), 'utf8');
const weatherMigrationSource = readFileSync(join(here, '../../../supabase/migrations/20260908210000_weather_and_worker_diagnostics.sql'), 'utf8');

test('worker delegates command application to the atomic database function', () => {
  assert.match(workerSource, /rpc\('apply_irrigation_command'/);
  assert.doesNotMatch(workerSource, /status:\s*'applied'/);
  assert.doesNotMatch(workerSource, /from\('valves'\)\.update/);
});

test('atomic command function claims, updates, and applies in one transaction', () => {
  assert.match(migrationSource, /security definer/);
  assert.match(migrationSource, /where id = target_command_id[\s\S]*and status = 'pending'[\s\S]*for update/);
  assert.match(migrationSource, /update public\.valves/);
  assert.match(migrationSource, /update public\.irrigation_commands[\s\S]*status = 'applied'/);
  assert.match(migrationSource, /grant execute on function public\.apply_irrigation_command\(uuid\) to service_role/);
});

test('irrigation command insert grant preserves the RLS and duration contracts', () => {
  assert.match(insertGrantMigrationSource, /^grant insert on table public\.irrigation_commands to authenticated;$/m);
  assert.match(schemaSource, /create policy "Operators can create irrigation commands"[\s\S]*with check \([\s\S]*public\.can_operate_valve\(valve_id\)[\s\S]*requested_by = auth\.uid\(\)[\s\S]*status = 'pending'/);
  assert.match(durationMigrationSource, /rename column duration_minutes to duration_seconds/);
  assert.match(durationMigrationSource, /check \(duration_seconds between 1 and 120\)/);
  assert.doesNotMatch(insertGrantMigrationSource, /apply_irrigation_command|grant execute/);
});

test('weather and diagnostics migration preserves organization-scoped read contracts', () => {
  assert.match(weatherMigrationSource, /create table public\.weather_readings/);
  assert.match(weatherMigrationSource, /rainfall_mm numeric\(7,2\) not null check \(rainfall_mm >= 0\)/);
  assert.match(weatherMigrationSource, /create table public\.worker_heartbeats/);
  assert.match(weatherMigrationSource, /public\.is_station_organization_member\(station_id\)/);
  assert.match(weatherMigrationSource, /public\.is_organization_member\(organization_id\)/);
  assert.match(weatherMigrationSource, /alter publication supabase_realtime add table public\.weather_readings/);
});

test('worker consumes both telemetry topics and records heartbeats', () => {
  assert.match(workerSource, /weatherTopic/);
  assert.match(workerSource, /worker_heartbeats/);
  assert.match(workerSource, /last_consumed_at/);
  assert.match(workerSource, /subscribe\(\{ topic: weatherTopic/);
});
