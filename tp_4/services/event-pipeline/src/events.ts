import { randomUUID } from 'node:crypto';

export const stationExternalIds = ['local-costa-1', 'local-costa-2', 'local-monte-a'] as const;
export const soilMoistureTopic = 'soil.moisture';
export const weatherTopic = 'weather.tick';
export type SoilMoistureEvent = { event_id: string; event_type: typeof soilMoistureTopic; station_external_id: string; measured_at: string; soil_moisture_pct: number; air_temperature_c: number };
export type WeatherTickEvent = { event_id: string; event_type: typeof weatherTopic; station_external_id: string; measured_at: string; rainfall_mm: number };

export function createSoilMoistureEvent(stationExternalId: string, moisture: number, temperature: number): SoilMoistureEvent {
  return { event_id: randomUUID(), event_type: soilMoistureTopic, station_external_id: stationExternalId, measured_at: new Date().toISOString(), soil_moisture_pct: Number(moisture.toFixed(2)), air_temperature_c: Number(temperature.toFixed(2)) };
}

export function validateSoilMoistureEvent(value: unknown): value is SoilMoistureEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as Partial<SoilMoistureEvent>;
  return event.event_type === soilMoistureTopic && typeof event.event_id === 'string' && event.event_id.length > 0 && typeof event.station_external_id === 'string' && event.station_external_id.length > 0 && typeof event.measured_at === 'string' && !Number.isNaN(Date.parse(event.measured_at)) && typeof event.soil_moisture_pct === 'number' && Number.isFinite(event.soil_moisture_pct) && event.soil_moisture_pct >= 0 && event.soil_moisture_pct <= 100 && typeof event.air_temperature_c === 'number' && Number.isFinite(event.air_temperature_c);
}

export function createWeatherTickEvent(stationExternalId: string, rainfallMm: number): WeatherTickEvent {
  return { event_id: randomUUID(), event_type: weatherTopic, station_external_id: stationExternalId, measured_at: new Date().toISOString(), rainfall_mm: Number(rainfallMm.toFixed(2)) };
}

export function validateWeatherTickEvent(value: unknown): value is WeatherTickEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as Partial<WeatherTickEvent>;
  return event.event_type === weatherTopic && typeof event.event_id === 'string' && event.event_id.length > 0 && typeof event.station_external_id === 'string' && event.station_external_id.length > 0 && typeof event.measured_at === 'string' && event.measured_at.endsWith('Z') && !Number.isNaN(Date.parse(event.measured_at)) && typeof event.rainfall_mm === 'number' && Number.isFinite(event.rainfall_mm) && event.rainfall_mm >= 0;
}
