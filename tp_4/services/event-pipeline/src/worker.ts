import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Kafka } from 'kafkajs';
import { soilMoistureTopic, weatherTopic, type SoilMoistureEvent, type WeatherTickEvent, validateSoilMoistureEvent, validateWeatherTickEvent } from './events.js';

const required = (name: string) => { const value = process.env[name]; if (!value) throw new Error(`Missing required environment variable: ${name}`); return value; };
const supabase = createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }) as SupabaseClient;
const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:19092').split(',');
const commandPollMs = Math.max(1000, Number(process.env.COMMAND_POLL_MS ?? 2000));
const commandApplyDelayMs = Math.max(1000, Number(process.env.COMMAND_APPLY_DELAY_MS ?? 8000));
const consumer = new Kafka({ clientId: 'agropulse-worker', brokers }).consumer({ groupId: 'agropulse-worker' });
const processingCommands = new Set<string>();
const autoClosingValves = new Set<string>();
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
  const { data: station, error: stationError } = await supabase.from('stations').select('id, plot_id, plots(organization_id)').eq('external_id', event.station_external_id).maybeSingle();
  if (stationError) throw stationError;
  if (!station) { log('discarded telemetry for unknown station', { station: event.station_external_id, event_type: event.event_type }); return; }
  const organizationId = (station.plots as unknown as { organization_id: string } | null)?.organization_id;
  if (!organizationId) { log('discarded telemetry without organization', { station: event.station_external_id }); return; }
  if (event.event_type === soilMoistureTopic) {
    const { error } = await supabase.from('readings').upsert({ station_id: station.id, measured_at: event.measured_at, source: 'sensor', soil_moisture_pct: event.soil_moisture_pct, air_temperature_c: event.air_temperature_c }, { onConflict: 'station_id,measured_at' });
    if (error) throw error;
    // RF-19 & RF-20: Sync stale and dry alerts for this station
    await syncStationAlerts(station.id);
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
    await sleep(commandApplyDelayMs + Math.floor(Math.random() * 2000));
    const { data, error } = await supabase.rpc('apply_irrigation_command', { target_command_id: command.id });
    if (error) throw error;
    if (!data) { log('skipped already-processed command', { command_id: command.id }); return; }
    log('applied irrigation command', { command_id: command.id, action: command.action });
  } catch (error) {
    await supabase.from('irrigation_commands').update({ status: 'failed' }).eq('id', command.id).eq('status', 'pending');
    console.error(JSON.stringify({ level: 'error', message: 'failed irrigation command', command_id: command.id, error: error instanceof Error ? error.message : String(error) }));
  }
}

async function checkExpiredIrrigationValves() {
  try {
    const { data: openValves, error: valveError } = await supabase
      .from('valves')
      .select('id, name')
      .eq('state', 'open');

    if (valveError) throw valveError;
    if (!openValves || openValves.length === 0) return;

    const now = Date.now();

    for (const valve of openValves) {
      if (autoClosingValves.has(valve.id)) continue;

      // Check if there is already a pending command on this valve to prevent duplicates
      const { data: pendingCommands, error: pendingError } = await supabase
        .from('irrigation_commands')
        .select('id')
        .eq('valve_id', valve.id)
        .eq('status', 'pending')
        .limit(1);

      if (pendingError) {
        console.error(JSON.stringify({ level: 'error', message: 'failed checking pending commands for valve', valve_id: valve.id, error: pendingError.message }));
        continue;
      }

      if (pendingCommands && pendingCommands.length > 0) {
        continue;
      }

      // Check the latest applied command for this valve
      const { data: lastCommand, error: cmdError } = await supabase
        .from('irrigation_commands')
        .select('id, action, duration_minutes, applied_at')
        .eq('valve_id', valve.id)
        .eq('status', 'applied')
        .order('applied_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cmdError) {
        console.error(JSON.stringify({ level: 'error', message: 'failed fetching last command for valve', valve_id: valve.id, error: cmdError.message }));
        continue;
      }

      let isExpired = false;
      if (!lastCommand || lastCommand.action !== 'open') {
        // Valve is open without an active open command (e.g. initial seed or manual state) -> auto-close to recover safe idle state
        isExpired = true;
      } else if (lastCommand.applied_at) {
        const appliedTime = new Date(lastCommand.applied_at).getTime();
        const durationMs = (lastCommand.duration_minutes ?? 1) * 60 * 1000;
        if (now >= appliedTime + durationMs) {
          isExpired = true;
        }
      }

      if (isExpired) {
        autoClosingValves.add(valve.id);
        try {
          log('auto-closing expired valve', { valve_id: valve.id, name: valve.name });
          const { error: insertError } = await supabase
            .from('irrigation_commands')
            .insert({
              valve_id: valve.id,
              action: 'close',
              duration_minutes: 1,
              client_request_id: randomUUID(),
              status: 'pending',
            });

          if (insertError) {
            log('skipped auto-close command insert', { valve_id: valve.id, error: insertError.message });
          }
        } finally {
          autoClosingValves.delete(valve.id);
        }
      }
    }
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', message: 'check expired valves failed', error: error instanceof Error ? error.message : String(error) }));
  }
}
// RF-19 & RF-20: Unify alert synchronization for stale and dry conditions.
// Runs idempotently for any reading source (Kafka, manual, direct inserts).
async function syncStationAlerts(stationId: string) {
  try {
    const { data: station } = await supabase
      .from('stations')
      .select('id, name, plot_id, plots(id, threshold_min, organization_id)')
      .eq('id', stationId)
      .maybeSingle();
    if (!station || !station.plot_id) return;
    const plot = station.plots as unknown as { id: string; threshold_min: number; organization_id: string } | null;
    if (!plot) return;

    const { data: latest } = await supabase
      .from('readings')
      .select('measured_at, soil_moisture_pct')
      .eq('station_id', station.id)
      .order('measured_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const now = Date.now();
    const isStale = !latest || (now - new Date(latest.measured_at).getTime() > 15 * 60 * 1000);

    if (isStale) {
      // 1. Check for existing unresolved stale alert
      const { data: existing } = await supabase
        .from('alerts')
        .select('id')
        .eq('plot_id', station.plot_id)
        .eq('severity', 'warning')
        .is('resolved_at', null)
        .limit(1);

      if (!existing || existing.length === 0) {
        await supabase.from('alerts').insert({
          plot_id: station.plot_id,
          message: `La estación "${station.name}" no reportó datos en los últimos 15 minutos. Los datos podrían no ser confiables.`,
          severity: 'warning',
        });
        log('created stale alert', { station_id: station.id, plot_id: station.plot_id });
      }

      // RF-20 & Invariant: An alert cannot coexist with another state for the same plot.
      // If stale, all dry alerts (critical or legacy warning) on this plot must be auto-resolved.
      const { data: openOther } = await supabase
        .from('alerts')
        .select('id, message, severity')
        .eq('plot_id', station.plot_id)
        .is('resolved_at', null);

      for (const a of openOther ?? []) {
        const msg = (a.message ?? '').toLowerCase();
        if (a.severity === 'critical' || msg.includes('humedad') || msg.includes('regar')) {
          await supabase
            .from('alerts')
            .update({ resolved_at: new Date().toISOString() })
            .eq('id', a.id);
          log('auto-resolved dry alert due to stale state', { alert_id: a.id, plot_id: station.plot_id });
        }
      }
    } else {
      // Station is active (< 15 min)!
      // Invariant: Stale alert cannot coexist when telemetry is fresh. Auto-resolve any open stale alerts.
      const { data: openStale } = await supabase
        .from('alerts')
        .select('id, message, severity')
        .eq('plot_id', station.plot_id)
        .is('resolved_at', null);

      for (const a of openStale ?? []) {
        const msg = (a.message ?? '').toLowerCase();
        if (a.severity === 'warning' && (msg.includes('estación') || msg.includes('minutos') || msg.includes('confiables'))) {
          await supabase
            .from('alerts')
            .update({ resolved_at: new Date().toISOString() })
            .eq('id', a.id);
          log('auto-resolved stale alert on fresh data', { alert_id: a.id, plot_id: station.plot_id });
        }
      }

      // Check dry condition against threshold_min
      if (latest.soil_moisture_pct < plot.threshold_min) {
        // Critical: Soil moisture below threshold
        const { data: existingDry } = await supabase
          .from('alerts')
          .select('id')
          .eq('plot_id', plot.id)
          .eq('severity', 'critical')
          .is('resolved_at', null)
          .limit(1);

        if (!existingDry || existingDry.length === 0) {
          await supabase.from('alerts').insert({
            plot_id: plot.id,
            message: `La humedad del suelo (${latest.soil_moisture_pct}%) está por debajo del umbral mínimo (${plot.threshold_min}%). Considere regar.`,
            severity: 'critical',
          });
          log('created dry alert', { plot_id: plot.id, moisture_pct: latest.soil_moisture_pct, threshold: plot.threshold_min });
        }
      } else {
        // Moisture is recovered (optimal or wet) -> auto-resolve all dry alerts on this plot
        const { data: openDry } = await supabase
          .from('alerts')
          .select('id, message, severity')
          .eq('plot_id', plot.id)
          .is('resolved_at', null);

        for (const a of openDry ?? []) {
          const msg = (a.message ?? '').toLowerCase();
          if (a.severity === 'critical' || msg.includes('humedad') || msg.includes('regar')) {
            await supabase
              .from('alerts')
              .update({ resolved_at: new Date().toISOString() })
              .eq('id', a.id);
            log('auto-resolved dry alert on recovery', { alert_id: a.id, plot_id: plot.id });
          }
        }
      }
    }
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', message: 'sync station alerts failed', station_id: stationId, error: error instanceof Error ? error.message : String(error) }));
  }
}

async function syncAllStationsAlerts() {
  try {
    const { data: stations } = await supabase.from('stations').select('id');
    if (!stations) return;
    for (const s of stations) {
      await syncStationAlerts(s.id);
    }
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', message: 'sync all stations alerts failed', error: error instanceof Error ? error.message : String(error) }));
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

let realtimeReadingsChannel: ReturnType<typeof supabase.channel> | null = null;

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

  setInterval(() => {
    void processCommands().catch((error) => console.error(JSON.stringify({ level: 'error', message: 'command poll failed', error: String(error) })));
    void checkExpiredIrrigationValves().catch((error) => console.error(JSON.stringify({ level: 'error', message: 'check expired valves poll failed', error: String(error) })));
  }, commandPollMs);
  void checkExpiredIrrigationValves();

  // Initial and periodic full station alerts sync (every 10s)
  void syncAllStationsAlerts();
  setInterval(() => { void syncAllStationsAlerts(); }, 10_000);

  // Realtime subscription on readings to evaluate alerts immediately on any reading insert/update
  try {
    realtimeReadingsChannel = supabase
      .channel('worker-readings-monitor')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'readings' }, (payload) => {
        const stationId = (payload.new as { station_id?: string } | null)?.station_id;
        if (stationId) {
          void syncStationAlerts(stationId);
        } else {
          void syncAllStationsAlerts();
        }
      })
      .subscribe();
  } catch (err) {
    log('Failed to initialize Supabase Realtime channel in worker', { error: String(err) });
  }

  // Emit periodic heartbeats every 15s so mobile diagnostics reflects real-time status
  void recordPeriodicHeartbeats();
  setInterval(() => { void recordPeriodicHeartbeats(); }, 15_000);
  log('worker ready', { brokers, command_poll_ms: commandPollMs });
}
async function shutdown() {
  if (stopping) return;
  stopping = true;
  log('worker shutting down');
  if (realtimeReadingsChannel) {
    try { await supabase.removeChannel(realtimeReadingsChannel); } catch { }
  }
  if (process.env.NO_KAFKA !== 'true') {
    try { await consumer.disconnect(); } catch { }
  }
}
process.once('SIGINT', () => void shutdown().finally(() => process.exit(0)));
process.once('SIGTERM', () => void shutdown().finally(() => process.exit(0)));
main().catch((error) => { console.error(error); void shutdown().finally(() => process.exit(1)); });
