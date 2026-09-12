import assert from 'node:assert/strict';
import test from 'node:test';
import { createSoilMoistureEvent, createWeatherTickEvent, validateSoilMoistureEvent, validateWeatherTickEvent } from './events.js';
test('validates events and rejects out-of-range moisture', () => { const event = createSoilMoistureEvent('local-costa-1', 35, 24); assert.equal(validateSoilMoistureEvent(event), true); assert.equal(validateSoilMoistureEvent({ ...event, soil_moisture_pct: 101 }), false); });
test('preserves event identity for safe retries', () => { const event = createSoilMoistureEvent('local-costa-1', 35, 24); assert.equal({ ...event }.event_id, event.event_id); });
test('creates and validates a UTC weather tick', () => { const event = createWeatherTickEvent('local-costa-1', 2.5); assert.equal(event.event_type, 'weather.tick'); assert.match(event.measured_at, /Z$/); assert.equal(validateWeatherTickEvent(event), true); assert.equal(validateWeatherTickEvent({ ...event, rainfall_mm: -1 }), false); });
