export type MapCoordinate = { latitude: number; longitude: number };
export type GeoJsonPolygon = { type: 'Polygon'; coordinates: number[][][] };

export type PlotStatus = 'stale' | 'dry' | 'optimal' | 'wet';

export const DEFAULT_STALE_AGE_MS = 24 * 60 * 60 * 1000;

export function computePlotStatus(
  moisture: number | null,
  measuredAt: string | null,
  thresholdMin: number,
  thresholdMax: number,
  now = Date.now(),
  maxAgeMs = 15 * 60 * 1000,
): PlotStatus {
  if (moisture === null || !measuredAt || now - new Date(measuredAt).getTime() > maxAgeMs) return 'stale';
  if (moisture < thresholdMin) return 'dry';
  if (moisture <= thresholdMax) return 'optimal';
  return 'wet';
}

export function polygonToMapCoordinates(boundary: unknown): MapCoordinate[] {
  let parsed = boundary;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }
  if (!parsed || typeof parsed !== 'object' || (parsed as { type?: string }).type !== 'Polygon') return [];
  const coordinates = (parsed as GeoJsonPolygon).coordinates?.[0];
  if (!Array.isArray(coordinates)) return [];
  return coordinates.flatMap((point) => {
    if (!Array.isArray(point) || typeof point[0] !== 'number' || typeof point[1] !== 'number') return [];
    return [{ longitude: point[0], latitude: point[1] }];
  });
}

export function isPointInPolygon(point: MapCoordinate, polygon: MapCoordinate[]): boolean {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    if (!currentPoint || !previousPoint) continue;
    const intersects = currentPoint.latitude > point.latitude !== previousPoint.latitude > point.latitude
      && point.longitude < ((previousPoint.longitude - currentPoint.longitude) * (point.latitude - currentPoint.latitude))
        / (previousPoint.latitude - currentPoint.latitude) + currentPoint.longitude;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function formatReadingAge(measuredAt: string | null, now = Date.now()): string {
  if (!measuredAt) return 'Sin lecturas';
  const minutes = Math.max(0, Math.round((now - new Date(measuredAt).getTime()) / 60000));
  if (minutes < 1) return 'Recién';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `hace ${hours} h ${minutes % 60} min`;
}
