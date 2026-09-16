import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('manual reading & offline queue contracts (RF-21)', () => {
  it('migration declares notes, latitude, and longitude columns with insert grants', () => {
    const migration = readFileSync(
      resolve(__dirname, '../../../../supabase/migrations/20260916120000_manual_reading_notes_gps.sql'),
      'utf8',
    );

    expect(migration).toContain('add column if not exists notes text');
    expect(migration).toContain('add column if not exists latitude numeric(9,6)');
    expect(migration).toContain('add column if not exists longitude numeric(9,6)');
    expect(migration).toContain('grant insert (notes, latitude, longitude)');
  });

  it('manual-reading screen integrates notes, GPS capture, and offline fallback', () => {
    const screenSource = readFileSync(
      resolve(__dirname, '../app/(app)/manual-reading.tsx'),
      'utf8',
    );

    expect(screenSource).toContain("import * as Location from 'expo-location'");
    expect(screenSource).toContain('fetchLocation');
    expect(screenSource).toContain('gpsCoords');
    expect(screenSource).toContain('notes');
    expect(screenSource).toContain('enqueueReading');
    expect(screenSource).toContain('PGRST204');
  });

  it('offline-queue supports notes and GPS coordinates in QueuedReading payload', () => {
    const queueSource = readFileSync(
      resolve(__dirname, './offline-queue.ts'),
      'utf8',
    );

    expect(queueSource).toContain('notes?: string | null');
    expect(queueSource).toContain('latitude?: number | null');
    expect(queueSource).toContain('longitude?: number | null');
    expect(queueSource).toContain('payload.notes = notes');
    expect(queueSource).toContain('payload.latitude = latitude');
    expect(queueSource).toContain('payload.longitude = longitude');
  });
});
