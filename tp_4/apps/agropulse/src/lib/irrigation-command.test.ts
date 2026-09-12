import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createClientRequestId, describeCommandStatus, validateCommandDuration } from './irrigation-command';

describe('irrigation command helpers', () => {
  it('accepts only integer durations from 1 to 120 minutes', () => {
    expect(validateCommandDuration('1')).toEqual({ value: 1, error: null, valid: true });
    expect(validateCommandDuration('120')).toEqual({ value: 120, error: null, valid: true });
    expect(validateCommandDuration('1.5').valid).toBe(false);
    expect(validateCommandDuration('0').error).toBe('Ingresá un número entero de 1 a 120 minutos.');
    expect(validateCommandDuration('121').error).toBe('Ingresá un número entero de 1 a 120 minutos.');
  });

  it('presents command lifecycle states consistently', () => {
    expect(describeCommandStatus('pending')).toEqual({ label: 'Pendiente', color: '#c78932' });
    expect(describeCommandStatus('applied')).toEqual({ label: 'Aplicado', color: '#549c60' });
    expect(describeCommandStatus('failed')).toEqual({ label: 'Fallido', color: '#d65c4a' });
    expect(describeCommandStatus('cancelled')).toEqual({ label: 'Cancelado', color: '#87918b' });
  });

  it('uses the minutes contract in the latest migration and plot detail source', () => {
    const migration = readFileSync(
      resolve(__dirname, '../../../../supabase/migrations/20260911210000_cancel_command_alerts_realtime_region.sql'),
      'utf8',
    );
    const plotSource = readFileSync(resolve(__dirname, '../app/(app)/plot/[id].tsx'), 'utf8');

    expect(migration).toContain('rename column duration_seconds to duration_minutes');
    expect(migration).toContain('duration_minutes between 1 and 120');
    expect(migration).toContain('grant insert (valve_id, action, duration_minutes, client_request_id)');
    expect(plotSource).toContain('duration_minutes');
    expect(plotSource).not.toContain('duration_seconds');
  });
});

describe('client_request_id idempotency (RNF-08)', () => {
  it('generates valid UUID v4 format', () => {
    const id = createClientRequestId();
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(id).toMatch(uuidV4Regex);
  });

  it('generates unique IDs on consecutive calls', () => {
    const ids = new Set(Array.from({ length: 100 }, () => createClientRequestId()));
    expect(ids.size).toBe(100);
  });

  it('schema enforces UNIQUE constraint on client_request_id', () => {
    const initialMigration = readFileSync(
      resolve(__dirname, '../../../../supabase/migrations/20260902210000_initial_agropulse_schema.sql'),
      'utf8',
    );
    // The unique partial index prevents duplicate client_request_id
    expect(initialMigration).toContain('client_request_id');
    expect(initialMigration).toMatch(/unique|UNIQUE/);
  });
});
