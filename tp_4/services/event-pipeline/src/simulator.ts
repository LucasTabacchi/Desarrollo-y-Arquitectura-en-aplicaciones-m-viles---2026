import { Kafka } from 'kafkajs';
import { createSoilMoistureEvent, createWeatherTickEvent, soilMoistureTopic, stationExternalIds, weatherTopic } from './events.js';

const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:19092').split(',');
const intervalMs = Math.max(3000, Math.min(8000, Number(process.env.SIMULATOR_INTERVAL_MS ?? 5000)));
const disabledStations = new Set(
  (process.env.DISABLED_STATIONS ?? process.env.STALE_STATIONS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
);
const producer = new Kafka({ clientId: 'agropulse-simulator', brokers }).producer();
let stopping = false;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

async function main() {
  await producer.connect();
  console.log(JSON.stringify({ level: 'info', message: 'simulator ready', brokers, interval_ms: intervalMs, disabled_stations: Array.from(disabledStations) }));
  while (!stopping) {
    for (const station of stationExternalIds) {
      if (disabledStations.has(station)) continue;
      const event = createSoilMoistureEvent(station, randomBetween(15, 55), randomBetween(18, 32));
      await producer.send({ topic: soilMoistureTopic, messages: [{ key: station, value: JSON.stringify(event) }] });
      console.log(JSON.stringify({ level: 'info', message: 'produced soil moisture event', event_id: event.event_id, station }));
      const weather = createWeatherTickEvent(station, randomBetween(0, 4));
      await producer.send({ topic: weatherTopic, messages: [{ key: station, value: JSON.stringify(weather) }] });
      console.log(JSON.stringify({ level: 'info', message: 'produced weather tick', event_id: weather.event_id, station, rainfall_mm: weather.rainfall_mm }));
    }
    await sleep(intervalMs);
  }
}
async function shutdown() { if (stopping) return; stopping = true; console.log(JSON.stringify({ level: 'info', message: 'simulator shutting down' })); await producer.disconnect(); }
process.once('SIGINT', () => void shutdown().finally(() => process.exit(0)));
process.once('SIGTERM', () => void shutdown().finally(() => process.exit(0)));
main().catch((error) => { console.error(error); void shutdown().finally(() => process.exit(1)); });
