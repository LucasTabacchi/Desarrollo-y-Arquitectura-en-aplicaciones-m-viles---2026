import { describe, expect, it } from 'vitest';

import { filterAndOrderHistory, toMoistureChartData } from './telemetry';

describe('telemetry history', () => {
  const now = Date.parse('2026-09-07T12:00:00Z');

  it('keeps valid readings from the last six hours and orders them oldest first', () => {
    const readings = [
      { measured_at: '2026-09-07T11:30:00Z', soil_moisture_pct: 38 },
      { measured_at: '2026-09-07T05:59:00Z', soil_moisture_pct: 20 },
      { measured_at: 'invalid', soil_moisture_pct: 99 },
      { measured_at: '2026-09-07T06:00:00Z', soil_moisture_pct: 30 },
    ];

    expect(filterAndOrderHistory(readings, now).map((reading) => reading.soil_moisture_pct)).toEqual([30, 38]);
  });

  it('creates chart points with threshold metadata and a safe empty state', () => {
    const chart = toMoistureChartData([
      { measured_at: '2026-09-07T10:00:00Z', soil_moisture_pct: 30 },
      { measured_at: '2026-09-07T11:00:00Z', soil_moisture_pct: 40 },
    ], 25, 45);

    expect(chart.points).toEqual([
      { x: 0, value: 30, measuredAt: '2026-09-07T10:00:00Z' },
      { x: 1, value: 40, measuredAt: '2026-09-07T11:00:00Z' },
    ]);
    expect(chart.min).toBe(0);
    expect(chart.max).toBe(100);
    expect(toMoistureChartData([], 25, 45).points).toEqual([]);
  });
});
