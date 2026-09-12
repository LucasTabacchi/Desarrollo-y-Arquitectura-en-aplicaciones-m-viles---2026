import { describe, expect, it } from 'vitest';

import { computePlotStatus, isPointInPolygon, polygonToMapCoordinates } from './plot-geometry';

describe('plot geometry', () => {
  it('applies status rules in first-match order', () => {
    const now = Date.parse('2026-09-07T12:00:00Z');
    expect(computePlotStatus(null, null, 25, 45, now)).toBe('stale');
    expect(computePlotStatus(50, '2026-09-07T11:44:59Z', 25, 45, now)).toBe('stale');
    expect(computePlotStatus(25, '2026-09-07T11:50:00Z', 25, 45, now)).toBe('optimal');
    expect(computePlotStatus(45, '2026-09-07T11:50:00Z', 25, 45, now)).toBe('optimal');
    expect(computePlotStatus(20, '2026-09-07T11:50:00Z', 25, 45, now)).toBe('dry');
    expect(computePlotStatus(46, '2026-09-07T11:50:00Z', 25, 45, now)).toBe('wet');
  });
  it('converts GeoJSON longitude/latitude order', () => {
    expect(polygonToMapCoordinates({ type: 'Polygon', coordinates: [[[-58.4, -31.39], [-58.3, -31.39]]] })).toEqual([{ longitude: -58.4, latitude: -31.39 }, { longitude: -58.3, latitude: -31.39 }]);
  });
  it('detects points inside and outside a polygon', () => {
    const square = polygonToMapCoordinates({ type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] });
    expect(isPointInPolygon({ latitude: 0.5, longitude: 0.5 }, square)).toBe(true);
    expect(isPointInPolygon({ latitude: 2, longitude: 0.5 }, square)).toBe(false);
  });
});
