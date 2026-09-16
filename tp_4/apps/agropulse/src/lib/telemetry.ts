export type TelemetryReading = { measured_at: string; soil_moisture_pct: number };

export function filterAndOrderHistory<T extends TelemetryReading>(readings: T[], now = Date.now()): T[] {
  const start = now - 6 * 60 * 60 * 1000;
  return readings
    .filter((reading) => {
      const timestamp = new Date(reading.measured_at).getTime();
      return Number.isFinite(timestamp) && timestamp >= start && timestamp <= now;
    })
    .sort((a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime());
}

export type MoistureChartData = {
  points: { x: number; value: number; measuredAt: string }[];
  min: number;
  max: number;
  thresholdMin: number;
  thresholdMax: number;
};

export function toMoistureChartData(
  readings: TelemetryReading[],
  thresholdMin: number,
  thresholdMax: number,
  maxPoints = 12,
): MoistureChartData {
  let sampled = readings;
  if (readings.length > maxPoints) {
    const step = (readings.length - 1) / (maxPoints - 1);
    sampled = [];
    for (let i = 0; i < maxPoints; i++) {
      sampled.push(readings[Math.round(i * step)]);
    }
  }

  return {
    points: sampled.map((reading, index) => ({
      x: index,
      value: reading.soil_moisture_pct,
      measuredAt: reading.measured_at,
    })),
    min: 0,
    max: 100,
    thresholdMin,
    thresholdMax,
  };
}
