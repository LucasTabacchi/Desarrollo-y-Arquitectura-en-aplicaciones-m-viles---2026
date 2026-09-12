import { describe, expect, it } from 'vitest';
import { describePipeline, workerLagSeconds } from './diagnostics';

describe('worker diagnostics', () => {
  it('calculates non-negative lag from the latest tick', () => {
    expect(workerLagSeconds('2026-01-01T00:00:00.000Z', new Date('2026-01-01T00:00:12.500Z'))).toBe(12.5);
    expect(workerLagSeconds(null, new Date())).toBeNull();
  });

  it('classifies missing and stale heartbeats', () => {
    expect(describePipeline(null, null)).toEqual({ label: 'Sin datos', tone: 'neutral' });
    expect(describePipeline('healthy', 10)).toEqual({ label: 'Operativo', tone: 'good' });
    expect(describePipeline('healthy', 301)).toEqual({ label: 'Demorado', tone: 'warning' });
  });
});
