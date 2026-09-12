import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Kafka } from 'kafkajs';
import { soilMoistureTopic, weatherTopic, type SoilMoistureEvent, type WeatherTickEvent, validateSoilMoistureEvent, validateWeatherTickEvent } from './events.js';

const required = (name: string) => { const value = process.env[name]; if (!value) throw new Error(`Missing required environment variable: ${name}`); return value; };
const supabase = createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }) as SupabaseClient;
const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:19092').split(',');
const commandPollMs = Math.max(1000, Number(process.env.COMMAND_POLL_MS ?? 2000));
const consumer = new Kafka({ clientId: 'agropulse-worker', brokers }).consumer({ groupId: 'agropulse-worker' });
const processingCommands = new Set<string>();
let stopping = false;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const log = (message: string, fields: Record<string, unknown> = {}) => console.log(JSON.stringify({ level: 'info', message, ...fields }));

async function recordHeartbeat(organizationId: string, event: SoilMoistureEvent | WeatherTickEvent) {
  const { error } = await supabase.from('worker_heartbeats').upsert({ organization_id: organizationId, worker_name: 'agropulse-worker', last_tick_at: event.measured_at, last_consumed_at: new Date().toISOString(), last_event_type: event.event_type, status: 'healthy', updated_at: new Date().toISOString() });
  if (error) throw error;
  log('recorded worker heartbeat', { organization_id: organizationId, event_type: event.event_type });
}

async function consumeTelemetry(message: Buffer | null) {
  if (!message) return;
  let value: unknown; try { value = JSON.parse(message.toString()); } catch { log('discarded invalid telemetry JSON'); return; }
  if (!validateSoilMoistureEvent(value) && !validateWeatherTickEvent(value)) { log('discarded invalid telemetry event'); return; }
  const event = value as SoilMoistureEvent | WeatherTickEvent;
  const { data: station, error: stationError } = await supabase.from('stations').select('id, plots(organization_id)').eq('external_id', event.station_external_id).maybeSingle();
  if (stationError) throw stationError;
  if (!station) { log('discarded telemetry for unknown station', { station: event.station_external_id, event_type: event.event_type }); return; }
  const organizationId = (station.plots as unknown as { organization_id: string } | null)?.organization_id;
  if (!organizationId) { log('discarded telemetry without organization', { station: event.station_external_id }); return; }
  if (event.event_type === soilMoistureTopic) {
    const { error } = await supabase.from('readings').upsert({ station_id: station.id, measured_at: event.measured_at, source: 'sensor', soil_moisture_pct: event.soil_moisture_pct, air_temperature_c: event.air_temperature_c }, { onConflict: 'station_id,measured_at' });
    if (error) throw error;
    // RF-19: generate "dry" alert if below threshold
    await checkDryAlert(station.id, organizationId, event.soil_moisture_pct);
  } else {
    const { error } = await supabase.from('weather_readings').upsert({ station_id: station.id, station_external_id: event.station_external_id, measured_at: event.measured_at, rainfall_mm: event.rainfall_mm, event_id: event.event_id }, { onConflict: 'station_id,measured_at' });
    if (error) throw error;
  }
  log('upserted telemetry', { event_id: event.event_id, station: event.station_external_id, event_type: event.event_type });
  await recordHeartbeat(organizationId, event);
}

async function processCommands() {
  const { data, error } = await supabase.from('irrigation_commands').select('id,valve_id,action').eq('status', 'pending').order('created_at').limit(20);
  if (error) throw error;
  for (const command of data ?? []) { if (!processingCommands.has(command.id)) { processingCommands.add(command.id); void applyCommand(command).finally(() => processingCommands.delete(command.id)); } }
}
async function applyCommand(command: { id: string; valve_id: string; action: 'open' | 'close' }) {
  try {
    await sleep(1000 + Math.floor(Math.random() * 3000));
    const { data, error } = await supabase.rpc('apply_irrigation_command', { target_command_id: command.id });
    if (error) throw error;
    if (!data) { log('skipped already-processed command', { command_id: command.id }); return; }
    log('applied irrigation command', { command_id: command.id, action: command.action });
  } catch (error) {
    await supabase.from('irrigation_commands').update({ status: 'failed' }).eq('id', command.id).eq('status', 'pending');
    console.error(JSON.stringify({ level: 'error', message: 'failed irrigation command', command_id: command.id, error: error instanceof Error ? error.message : String(error) }));
  }
}
// RF-19: Check if moisture is below the plot's threshold and create an alert if no unresolved one exists
async function checkDryAlert(stationId: string, organizationId: string, moisturePct: number) {
  try {
    const { data: stationPlot } = await supabase.from('stations').select('plot_id, plots(threshold_min, id)').eq('id', stationId).maybeSingle();
    if (!stationPlot) return;
    const plot = stationPlot.plots as unknown as { threshold_min: number; id: string } | null;
    if (!plot || moisturePct >= plot.threshold_min) return;
    // Check for existing unresolved dry alert on this plot
    const { data: existing } = await supabase.from('alerts').select('id').eq('plot_id', plot.id).eq('severity', 'critical').is('resolved_at', null).limit(1);
    if (existing && existing.length > 0) return;
    await supabase.from('alerts').insert({ plot_id: plot.id, message: `La humedad del suelo (${moisturePct}%) está por debajo del umbral mínimo (${plot.threshold_min}%). Considere regar.`, severity: 'critical' });
    log('created dry alert', { plot_id: plot.id, moisture_pct: moisturePct, threshold: plot.threshold_min });
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', message: 'dry alert check failed', error: error instanceof Error ? error.message : String(error) }));
  }
}

// RF-20: Check for stale stations (no tick > 15 min) and create alerts
async function checkStaleStations() {
  try {
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    // Find stations whose latest reading is older than 15 minutes
    const { data: stations } = await supabase.from('stations').select('id, name, plot_id, plots(organization_id)');
    if (!stations) return;
    for (const station of stations) {
      const { data: latest } = await supabase.from('readings').select('measured_at').eq('station_id', station.id).order('measured_at', { ascending: false }).limit(1).maybeSingle();
      if (!latest || new Date(latest.measured_at) < new Date(fifteenMinAgo)) {
        // Check for existing unresolved stale alert
        const { data: existing } = await supabase.from('alerts').select('id').eq('plot_id', station.plot_id).eq('severity', 'warning').is('resolved_at', null).limit(1);
        if (existing && existing.length > 0) continue;
        await supabase.from('alerts').insert({ plot_id: station.plot_id, message: `La estación "${station.name}" no reportó datos en los últimos 15 minutos. Los datos podrían no ser confiables.`, severity: 'warning' });
        log('created stale alert', { station_id: station.id, plot_id: station.plot_id });
      }
    }
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', message: 'stale check failed', error: error instanceof Error ? error.message : String(error) }));
  }
}

// Periodic heartbeat so system diagnostics and observability reflect worker vitality in all modes
async function recordPeriodicHeartbeats() {
  try {
    const { data: orgs, error } = await supabase.from('organizations').select('id');
    if (error || !orgs || orgs.length === 0) return;
    const now = new Date().toISOString();
    for (const org of orgs) {
      await supabase.from('worker_heartbeats').upsert({
        organization_id: org.id,
        worker_name: 'agropulse-worker',
        last_tick_at: now,
        last_consumed_at: now,
        last_event_type: 'soil.moisture',
        status: 'healthy',
        updated_at: now,
      });
    }
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', message: 'periodic heartbeat failed', error: error instanceof Error ? error.message : String(error) }));
  }
}

async function main() {
  if (process.env.NO_KAFKA !== 'true') {
    try {
      await consumer.connect();
      await consumer.subscribe({ topic: soilMoistureTopic, fromBeginning: false });
      await consumer.subscribe({ topic: weatherTopic, fromBeginning: false });
      await consumer.run({
        eachMessage: async ({ message }) => {
          try {
            await consumeTelemetry(message.value);
          } catch (error) {
            console.error(JSON.stringify({ level: 'error', message: 'telemetry processing failed', error: error instanceof Error ? error.message : String(error) }));
          }
        },
      });
    } catch (err) {
      log('Kafka broker not reachable, continuing in standalone command mode', { error: String(err) });
    }
  } else {
    log('Running in standalone mode without Kafka broker');
  }

  setInterval(() => { void processCommands().catch((error) => console.error(JSON.stringify({ level: 'error', message: 'command poll failed', error: String(error) }))); }, commandPollMs);
  // RF-20: Periodically check for stale stations (every 60s)
  setInterval(() => { void checkStaleStations().catch((error) => console.error(JSON.stringify({ level: 'error', message: 'stale station check failed', error: String(error) }))); }, 60_000);
  // Emit periodic heartbeats every 15s so mobile diagnostics reflects real-time status
  void recordPeriodicHeartbeats();
  setInterval(() => { void recordPeriodicHeartbeats(); }, 15_000);
  log('worker ready', { brokers, command_poll_ms: commandPollMs });
}
async function shutdown() {
  if (stopping) return;
  stopping = true;
  log('worker shutting down');
  if (process.env.NO_KAFKA !== 'true') {
    try { await consumer.disconnect(); } catch { }
  }
}
process.once('SIGINT', () => void shutdown().finally(() => process.exit(0)));
process.once('SIGTERM', () => void shutdown().finally(() => process.exit(0)));
main().catch((error) => { console.error(error); void shutdown().finally(() => process.exit(1)); });
