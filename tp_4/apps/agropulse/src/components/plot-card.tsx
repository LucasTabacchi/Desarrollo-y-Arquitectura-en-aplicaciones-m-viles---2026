import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { computePlotStatus, DEFAULT_STALE_AGE_MS, formatReadingAge, type PlotStatus } from '@/lib/plot-geometry';

export type Reading = {
  measured_at: string;
  soil_moisture_pct: number;
  air_temperature_c?: number | null;
};

export type Plot = {
  id: string;
  name: string;
  crop: string | null;
  threshold_min: number;
  threshold_max: number;
  boundary?: unknown;
  stations?: {
    id?: string;
    name?: string;
    external_id?: string | null;
    readings?: Reading[];
  }[];
};

const statusConfig: Record<
  PlotStatus,
  {
    label: string;
    color: string;
    bg: string;
    cardBg: string;
    border: string;
    hint: string;
    icon: keyof typeof Ionicons.glyphMap;
    dotColor: string;
    telemetryText: string;
    chevronColor: string;
  }
> = {
  optimal: {
    label: 'ÓPTIMO',
    color: '#22c55e',
    bg: 'rgba(34, 197, 94, 0.16)',
    cardBg: '#101a14',
    border: 'rgba(34, 197, 94, 0.22)',
    hint: 'Nivel hídrico en rango ideal',
    icon: 'leaf-outline',
    dotColor: '#22c55e',
    telemetryText: 'Telemetría activa',
    chevronColor: 'rgba(34, 197, 94, 0.7)',
  },
  dry: {
    label: 'SECO',
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.2)',
    cardBg: '#1f1315',
    border: 'rgba(239, 68, 68, 0.28)',
    hint: 'Bajo umbral mín. · Requiere riego',
    icon: 'water-outline',
    dotColor: '#ef4444',
    telemetryText: 'Atención requerida',
    chevronColor: 'rgba(239, 68, 68, 0.8)',
  },
  wet: {
    label: 'HÚMEDO',
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.18)',
    cardBg: '#101824',
    border: 'rgba(59, 130, 246, 0.25)',
    hint: 'Suelo saturado · No aplicar riego',
    icon: 'water',
    dotColor: '#3b82f6',
    telemetryText: 'Atención requerida',
    chevronColor: 'rgba(59, 130, 246, 0.8)',
  },
  stale: {
    label: 'SIN DATOS',
    color: '#86948a',
    bg: 'rgba(107, 114, 128, 0.18)',
    cardBg: '#141715',
    border: '#242b26',
    hint: 'Sin lecturas recientes',
    icon: 'cloud-offline-outline',
    dotColor: '#6b7280',
    telemetryText: 'Señal perdida',
    chevronColor: '#6b7280',
  },
};

function getCropMeta(crop: string | null): { label: string } {
  const normalized = (crop ?? '').toLowerCase();
  if (normalized.includes('citrus') || normalized.includes('limon') || normalized.includes('naranja') || normalized.includes('mandarina')) {
    return { label: crop ?? 'Citrus' };
  }
  if (normalized.includes('soja') || normalized.includes('soy')) {
    return { label: crop ?? 'Soja' };
  }
  if (normalized.includes('maiz') || normalized.includes('corn')) {
    return { label: crop ?? 'Maíz' };
  }
  return { label: crop ?? 'Cultivo general' };
}

function getReadingAgeText(measuredAt: string | null, status: PlotStatus): string {
  if (!measuredAt) return 'Sin lecturas';
  if (status === 'stale') return 'Lectura antigua (>15 min)';
  const age = formatReadingAge(measuredAt);
  if (age === 'Recién') return 'Actualizado recién';
  return `Actualizado ${age}`;
}

export function PlotCard({ plot, onPress }: { plot: Plot; onPress: () => void }) {
  const allReadings = (plot.stations ?? [])
    .flatMap((s) => s.readings ?? [])
    .filter((r) => r && r.measured_at && Number.isFinite(Number(r.soil_moisture_pct)))
    .sort((a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime());
  const latest = allReadings[0] ?? null;

  const status = computePlotStatus(
    latest?.soil_moisture_pct ?? null,
    latest?.measured_at ?? null,
    Number(plot.threshold_min),
    Number(plot.threshold_max),
  );

  const config = statusConfig[status];
  const cropMeta = getCropMeta(plot.crop);

  const min = Math.max(0, Math.min(100, Number(plot.threshold_min) || 0));
  const max = Math.max(min, Math.min(100, Number(plot.threshold_max) || 100));
  const moisture = latest?.soil_moisture_pct != null ? Math.max(0, Math.min(100, latest.soil_moisture_pct)) : null;

  const stationsCount = plot.stations?.length ?? 0;
  const stationInfo = stationsCount > 1 ? `${stationsCount} estaciones` : plot.stations?.[0]?.name;
  const agronomicNotice = status === 'dry' ? 'Riego sugerido' : (status === 'wet' ? 'No aplicar riego' : null);
  const subtitleDetail = agronomicNotice || stationInfo;
  const subtitleText = `Cultivo: ${cropMeta.label}${subtitleDetail ? ` · ${subtitleDetail}` : ''}`;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: config.cardBg, borderColor: config.border },
        pressed && styles.cardPressed,
      ]}
    >
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.avatarBox, { backgroundColor: config.bg, borderColor: config.border }]}>
            <Ionicons name={config.icon} size={20} color={config.color} />
          </View>
          <View style={styles.headerInfo}>
            <View style={styles.titleRow}>
              <Text style={styles.plotName} numberOfLines={1}>{plot.name}</Text>
              <View style={[styles.badge, { backgroundColor: config.bg }]}>
                <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
              </View>
            </View>
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitleText}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <Ionicons
            name={status === 'stale' ? 'time-outline' : 'chevron-forward'}
            size={status === 'stale' ? 22 : 18}
            color={config.chevronColor}
          />
        </View>
      </View>

      {/* Metrics Row */}
      <View style={styles.metricsRow}>
        {/* Metric: Humedad */}
        <View style={styles.metricCol}>
          <View style={styles.metricIconBox}>
            <Ionicons
              name="water-outline"
              size={18}
              color={status === 'dry' ? '#ef4444' : (status === 'stale' ? '#52695c' : '#38bdf8')}
            />
          </View>
          <View style={styles.metricInfo}>
            <View style={styles.metricLabelRow}>
              <Text style={styles.metricLabel}>Humedad</Text>
              <Text style={styles.metricSubText}>Obj {min}–{max}%</Text>
            </View>
            <Text
              style={[
                styles.metricValue,
                { color: status === 'dry' ? '#ef4444' : (moisture != null ? '#ffffff' : '#6b7280') },
              ]}
            >
              {moisture != null ? `${moisture}%` : '--'}
            </Text>
          </View>
        </View>

        {/* Metric: Temperatura */}
        <View style={styles.metricCol}>
          <View style={styles.metricIconBox}>
            <Ionicons
              name="thermometer-outline"
              size={18}
              color={latest?.air_temperature_c != null ? '#22c55e' : '#52695c'}
            />
          </View>
          <View style={styles.metricInfo}>
            <View style={styles.metricLabelRow}>
              <Text style={styles.metricLabel}>Temperatura</Text>
              <Text style={styles.metricSubText}>Ambiente</Text>
            </View>
            <Text
              style={[
                styles.metricValue,
                { color: latest?.air_temperature_c != null ? '#ffffff' : '#6b7280' },
              ]}
            >
              {latest?.air_temperature_c != null ? `${latest.air_temperature_c}°C` : '--'}
            </Text>
          </View>
        </View>
      </View>

      {/* Moisture Gauge Visual */}
      <View style={styles.gaugeContainer}>
        <View style={styles.gaugeTrack}>
          {/* Target Zone */}
          <View
            style={[
              styles.targetZone,
              {
                left: `${min}%`,
                width: `${Math.max(0, max - min)}%`,
              },
            ]}
          />
          {/* Moisture Fill / Indicator */}
          {moisture != null && (
            <View
              style={[
                styles.moistureIndicator,
                {
                  left: `${Math.max(2, Math.min(98, moisture))}%`,
                  backgroundColor: status === 'dry' ? '#ef4444' : config.color,
                  shadowColor: config.color,
                },
              ]}
            />
          )}
        </View>
        <View style={styles.gaugeLabels}>
          <Text style={styles.gaugeLabel}>0%</Text>
          <Text style={styles.gaugeLabelCenter}>Rango óptimo {min}% – {max}%</Text>
          <Text style={styles.gaugeLabel}>100%</Text>
        </View>
      </View>

      {/* Footer Row */}
      <View style={styles.footerRow}>
        <View style={styles.footerLeft}>
          <View style={[styles.statusDot, { backgroundColor: config.dotColor }]} />
          <Text style={[styles.footerStatusText, { color: config.dotColor }]}>
            {config.telemetryText}
          </Text>
        </View>
        <Text style={styles.footerAgeText}>
          {getReadingAgeText(latest?.measured_at ?? null, status)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 3,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  avatarBox: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  headerInfo: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  plotName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  subtitle: {
    color: '#86948a',
    fontSize: 12.5,
    fontWeight: '500',
  },
  headerRight: {
    paddingLeft: 8,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 2,
  },
  metricCol: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  metricIconBox: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 26,
  },
  metricInfo: {
    flex: 1,
    gap: 1,
  },
  metricLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricLabel: {
    color: '#86948a',
    fontSize: 11.5,
    fontWeight: '500',
  },
  metricSubText: {
    color: '#52695c',
    fontSize: 10.5,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  gaugeContainer: {
    gap: 4,
    marginTop: -2,
  },
  gaugeTrack: {
    backgroundColor: '#1a221d',
    borderRadius: 999,
    height: 5,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  targetZone: {
    backgroundColor: 'rgba(34, 197, 94, 0.22)',
    borderRadius: 999,
    bottom: 0,
    position: 'absolute',
    top: 0,
  },
  moistureIndicator: {
    borderRadius: 999,
    bottom: 0,
    elevation: 2,
    marginLeft: -3,
    position: 'absolute',
    top: 0,
    width: 6,
  },
  gaugeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 1,
  },
  gaugeLabel: {
    color: '#52695c',
    fontSize: 9.5,
    fontWeight: '600',
  },
  gaugeLabelCenter: {
    color: '#718277',
    fontSize: 9.5,
    fontWeight: '600',
  },
  footerRow: {
    alignItems: 'center',
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
    paddingTop: 10,
  },
  footerLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  statusDot: {
    borderRadius: 999,
    height: 6.5,
    width: 6.5,
  },
  footerStatusText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  footerAgeText: {
    color: '#86948a',
    fontSize: 11,
    fontWeight: '500',
  },
});
