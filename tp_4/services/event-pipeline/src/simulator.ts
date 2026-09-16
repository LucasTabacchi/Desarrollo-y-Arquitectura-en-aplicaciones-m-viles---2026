import { Kafka } from 'kafkajs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createSoilMoistureEvent, createWeatherTickEvent, soilMoistureTopic, stationExternalIds, weatherTopic } from './events.js';

const isStandalone = process.env.NO_KAFKA === 'true';
const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:19092').split(',');
const intervalMs = Math.max(3000, Math.min(8000, Number(process.env.SIMULATOR_INTERVAL_MS ?? 8000)));
const disabledStations = new Set(
  (process.env.DISABLED_STATIONS ?? process.env.STALE_STATIONS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
);

let producer: ReturnType<Kafka['producer']> | null = null;
let supabase: SupabaseClient | null = null;
const stationIdMap = new Map<string, string>();
let stopping = false;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

async function initStandalone() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for standalone simulator mode');
  }
  supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: stations, error } = await supabase.from('stations').select('id, external_id');
  if (error) throw error;
  for (const s of stations ?? []) {
    if (s.external_id) stationIdMap.set(s.external_id, s.id);
  }
  console.log(JSON.stringify({
    level: 'info',
    message: 'standalone simulator ready (writing directly to Supabase)',
    interval_ms: intervalMs,
    resolved_stations: Array.from(stationIdMap.keys()),
    disabled_stations: Array.from(disabledStations),
  }));
}

async function main() {
  if (isStandalone) {
    await initStandalone();
  } else {
    producer = new Kafka({ clientId: 'agropulse-simulator', brokers }).producer();
    await producer.connect();
    console.log(JSON.stringify({
      level: 'info',
      message: 'kafka simulator ready',
      brokers,
      interval_ms: intervalMs,
      disabled_stations: Array.from(disabledStations),
    }));
  }

  while (!stopping) {
    for (const station of stationExternalIds) {
      if (disabledStations.has(station)) continue;

      const event = createSoilMoistureEvent(station, randomBetween(15, 55), randomBetween(18, 32));
      const weather = createWeatherTickEvent(station, randomBetween(0, 4));

      if (isStandalone && supabase) {
        let stationId = stationIdMap.get(station);
        if (!stationId) {
          const { data } = await supabase.from('stations').select('id, external_id').eq('external_id', station).maybeSingle();
          if (data) {
            stationId = data.id;
            stationIdMap.set(station, data.id);
          }
        }
        if (stationId) {
          await supabase.from('readings').upsert(
            {
              station_id: stationId,
              measured_at: event.measured_at,
              source: 'sensor',
              soil_moisture_pct: event.soil_moisture_pct,
              air_temperature_c: event.air_temperature_c,
            },
            { onConflict: 'station_id,measured_at' },
          );
          await supabase.from('weather_readings').upsert(
            {
              station_id: stationId,
              station_external_id: station,
              measured_at: weather.measured_at,
              rainfall_mm: weather.rainfall_mm,
              event_id: weather.event_id,
            },
            { onConflict: 'station_id,measured_at' },
          );
        }
        console.log(JSON.stringify({
          level: 'info',
          message: 'standalone produced telemetry',
          station,
          soil_moisture_pct: event.soil_moisture_pct,
          rainfall_mm: weather.rainfall_mm,
        }));
      } else if (producer) {
        await producer.send({ topic: soilMoistureTopic, messages: [{ key: station, value: JSON.stringify(event) }] });
        console.log(JSON.stringify({ level: 'info', message: 'produced soil moisture event', event_id: event.event_id, station }));
        await producer.send({ topic: weatherTopic, messages: [{ key: station, value: JSON.stringify(weather) }] });
        console.log(JSON.stringify({ level: 'info', message: 'produced weather tick', event_id: weather.event_id, station, rainfall_mm: weather.rainfall_mm }));
      }
    }
    await sleep(intervalMs);
  }
}

async function shutdown() {
  if (stopping) return;
  stopping = true;
  console.log(JSON.stringify({ level: 'info', message: 'simulator shutting down' }));
  if (producer) {
    try { await producer.disconnect(); } catch { }
  }
}

process.once('SIGINT', () => void shutdown().finally(() => process.exit(0)));
process.once('SIGTERM', () => void shutdown().finally(() => process.exit(0)));
main().catch((error) => { console.error(error); void shutdown().finally(() => process.exit(1)); });

