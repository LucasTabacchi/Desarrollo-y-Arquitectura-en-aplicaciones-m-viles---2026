import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { supabase } from './supabase';
import { createClientRequestId } from './irrigation-command';

const QUEUE_KEY = 'agropulse.offline-queue';

export type QueuedReading = {
  id: string;
  stationId: string;
  measuredAt: string;
  soilMoisturePct: number;
  airTemperatureC: number | null;
  notes?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type QueuedCommand = {
  id: string;
  valveId: string;
  action: 'open' | 'close';
  durationMinutes: number;
  clientRequestId: string;
};

type QueueItem =
  | { type: 'manual-reading'; payload: QueuedReading; createdAt: string }
  | { type: 'irrigation-command'; payload: QueuedCommand; createdAt: string };

async function getQueue(): Promise<QueueItem[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as QueueItem[];
  } catch {
    return [];
  }
}

async function saveQueue(items: QueueItem[]): Promise<void> {
  if (items.length === 0) {
    await AsyncStorage.removeItem(QUEUE_KEY);
  } else {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  }
}

export async function enqueueReading(reading: Omit<QueuedReading, 'id'>): Promise<void> {
  const queue = await getQueue();
  queue.push({
    type: 'manual-reading',
    payload: { ...reading, id: createClientRequestId() },
    createdAt: new Date().toISOString(),
  });
  await saveQueue(queue);
}

export async function enqueueCommand(command: Omit<QueuedCommand, 'id'>): Promise<void> {
  const queue = await getQueue();
  queue.push({
    type: 'irrigation-command',
    payload: { ...command, id: createClientRequestId() },
    createdAt: new Date().toISOString(),
  });
  await saveQueue(queue);
}

export async function flushQueue(): Promise<{ flushed: number; remaining: number }> {
  const queue = await getQueue();
  if (queue.length === 0) return { flushed: 0, remaining: 0 };

  const remaining: QueueItem[] = [];
  let flushed = 0;

  for (const item of queue) {
    try {
      if (item.type === 'manual-reading') {
        const { stationId, measuredAt, soilMoisturePct, airTemperatureC, notes, latitude, longitude } = item.payload;
        const payload: Record<string, unknown> = {
          station_id: stationId,
          measured_at: measuredAt,
          source: 'manual',
          soil_moisture_pct: soilMoisturePct,
          air_temperature_c: airTemperatureC,
        };
        if (notes) payload.notes = notes;
        if (latitude != null) payload.latitude = latitude;
        if (longitude != null) payload.longitude = longitude;

        let { error } = await supabase.from('readings').upsert(
          payload,
          { onConflict: 'station_id,measured_at' },
        );
        if (error && error.code === 'PGRST204') {
          delete payload.notes;
          delete payload.latitude;
          delete payload.longitude;
          const retry = await supabase.from('readings').upsert(
            payload,
            { onConflict: 'station_id,measured_at' },
          );
          error = retry.error;
        }
        if (error && error.code !== '23505') throw error;
      } else {
        const { valveId, action, durationMinutes, clientRequestId } = item.payload;
        const { error } = await supabase.from('irrigation_commands').insert({
          valve_id: valveId,
          action,
          duration_minutes: durationMinutes,
          client_request_id: clientRequestId,
        });
        // Duplicate is OK (idempotency) — don't re-queue
        if (error && error.code !== '23505') throw error;
      }
      flushed++;
    } catch {
      remaining.push(item);
    }
  }

  await saveQueue(remaining);
  return { flushed, remaining: remaining.length };
}

export async function pendingCount(): Promise<number> {
  return (await getQueue()).length;
}

// Auto-flush when app comes to foreground
let listenerRegistered = false;
export function registerAutoFlush(): void {
  if (listenerRegistered) return;
  listenerRegistered = true;
  AppState.addEventListener('change', (state) => {
    if (state === 'active') void flushQueue();
  });
}
