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
  { label: string; color: string; bg: string; border: string; hint: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  optimal: {
    label: 'Óptimo',
    color: '#4ade80',
    bg: 'rgba(74, 222, 128, 0.14)',
    border: 'rgba(74, 222, 128, 0.3)',
    hint: 'Nivel hídrico en rango ideal',
    icon: 'checkmark-circle',
  },
  dry: {
    label: 'Seco',
    color: '#f87171',
    bg: 'rgba(248, 113, 113, 0.16)',
    border: 'rgba(248, 113, 113, 0.35)',
    hint: 'Bajo umbral mín. · Requiere riego',
    icon: 'alert-circle',
  },
  wet: {
    label: 'Húmedo',
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.14)',
    border: 'rgba(56, 189, 248, 0.3)',
    hint: 'Suelo saturado · Suspender riego',
    icon: 'water',
  },
  stale: {
    label: 'Sin datos',
    color: '#94a3b8',
    bg: 'rgba(148, 163, 184, 0.12)',
    border: 'rgba(148, 163, 184, 0.25)',
    hint: 'Sin lecturas recientes',
    icon: 'time',
  },
};

function getCropMeta(crop: string | null): { icon: keyof typeof Ionicons.glyphMap; color: string; label: string } {
  const normalized = (crop ?? '').toLowerCase();
  if (normalized.includes('citrus') || normalized.includes('limon') || normalized.includes('naranja') || normalized.includes('mandarina')) {
    return { icon: 'nutrition-outline', color: '#fb923c', label: crop ?? 'Citrus' };
  }
  if (normalized.includes('soja') || normalized.includes('soy')) {
    return { icon: 'leaf-outline', color: '#4ade80', label: crop ?? 'Soja' };
  }
  if (normalized.includes('maiz') || normalized.includes('corn')) {
    return { icon: 'sunny-outline', color: '#facc15', label: crop ?? 'Maíz' };
  }
  return { icon: 'leaf-outline', color: '#a3e635', label: crop ?? 'Cultivo general' };
}

export function PlotCard({ plot, onPress }: { plot: Plot; onPress: () => void }) {
  const latest = plot.stations?.[0]?.readings?.[0] ?? null;
  const status = computePlotStatus(
    latest?.soil_moisture_pct ?? null,
    latest?.measured_at ?? null,
    Number(plot.threshold_min),
    Number(plot.threshold_max),
    Date.now(),
    DEFAULT_STALE_AGE_MS,
  );

  const config = statusConfig[status];
  const cropMeta = getCropMeta(plot.crop);

  const min = Math.max(0, Math.min(100, Number(plot.threshold_min) || 0));
  const max = Math.max(min, Math.min(100, Number(plot.threshold_max) || 100));
  const moisture = latest?.soil_moisture_pct != null ? Math.max(0, Math.min(100, latest.soil_moisture_pct)) : null;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.cropAvatar, { backgroundColor: `${cropMeta.color}18`, borderColor: `${cropMeta.color}40` }]}>
            <Ionicons name={cropMeta.icon} size={22} color={cropMeta.color} />
          </View>
          <View style={styles.titleArea}>
            <Text style={styles.plotName}>{plot.name}</Text>
            <View style={styles.subTitleRow}>
              <Text style={[styles.cropLabel, { color: cropMeta.color }]}>{cropMeta.label}</Text>
              {plot.stations?.[0]?.name && (
                <>
                  <Text style={styles.dotSeparator}>•</Text>
                  <Text style={styles.stationLabel}>{plot.stations[0].name}</Text>
                </>
              )}
            </View>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={[styles.statusPill, { backgroundColor: config.bg, borderColor: config.border }]}>
            <View style={[styles.statusDot, { backgroundColor: config.color }]} />
            <Text style={[styles.statusLabel, { color: config.color }]}>{config.label}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#708078" />
        </View>
      </View>

      {/* Telemetry Grid */}
      <View style={styles.metricsGrid}>
        {/* Metric 1: Humedad */}
        <View style={styles.metricTile}>
          <View style={styles.metricTitleRow}>
            <Ionicons name="water-outline" size={14} color="#38bdf8" />
            <Text style={styles.metricTitle}>HUMEDAD SUELO</Text>
          </View>
          <View style={styles.metricValueRow}>
            <Text style={[styles.metricValue, { color: moisture != null ? config.color : '#94a3b8' }]}>
              {moisture != null ? `${moisture}%` : '--'}
            </Text>
            <Text style={styles.metricRange}>Obj {min}–{max}%</Text>
          </View>
        </View>

        {/* Metric 2: Temperatura */}
        <View style={styles.metricTile}>
          <View style={styles.metricTitleRow}>
            <Ionicons name="thermometer-outline" size={14} color="#f97316" />
            <Text style={styles.metricTitle}>TEMPERATURA</Text>
          </View>
          <View style={styles.metricValueRow}>
            <Text style={styles.metricValue}>
              {latest?.air_temperature_c != null ? `${latest.air_temperature_c}°C` : '--'}
            </Text>
            <Text style={styles.metricSub}>Ambiente</Text>
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
                width: `${max - min}%`,
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
                  backgroundColor: config.color,
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

      {/* Footer Banner */}
      <View style={[styles.footerBanner, { backgroundColor: config.bg, borderColor: config.border }]}>
        <View style={styles.footerHint}>
          <Ionicons name={config.icon} size={15} color={config.color} />
          <Text style={[styles.footerText, { color: config.color }]}>{config.hint}</Text>
        </View>
        <Text style={styles.footerTime}>{formatReadingAge(latest?.measured_at ?? null)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#132d20',
    borderColor: '#264a37',
    borderRadius: 24,
    borderWidth: 1.5,
    gap: 13,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 3,
  },
  cardPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.985 }],
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
  cropAvatar: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.2,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  titleArea: {
    flex: 1,
    gap: 2,
  },
  plotName: {
    color: '#f8f3e8',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  subTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  cropLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  dotSeparator: {
    color: '#52695c',
    fontSize: 11,
  },
  stationLabel: {
    color: '#8fa597',
    fontSize: 12,
    fontWeight: '500',
  },
  headerRight: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  statusPill: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusDot: {
    borderRadius: 999,
    height: 7,
    width: 7,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  metricTile: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    padding: 12,
  },
  metricTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  metricTitle: {
    color: '#8fa597',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  metricValueRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'space-between',
  },
  metricValue: {
    color: '#f8f3e8',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  metricRange: {
    color: '#8fa597',
    fontSize: 11,
    fontWeight: '600',
  },
  metricSub: {
    color: '#8fa597',
    fontSize: 11,
    fontWeight: '600',
  },
  gaugeContainer: {
    gap: 5,
  },
  gaugeTrack: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 999,
    height: 8,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  targetZone: {
    backgroundColor: 'rgba(74, 222, 128, 0.28)',
    borderRadius: 999,
    bottom: 0,
    position: 'absolute',
    top: 0,
  },
  moistureIndicator: {
    borderRadius: 999,
    bottom: 0,
    elevation: 2,
    marginLeft: -4,
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    top: 0,
    width: 8,
  },
  gaugeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  gaugeLabel: {
    color: '#657e70',
    fontSize: 10,
    fontWeight: '600',
  },
  gaugeLabelCenter: {
    color: '#8fa597',
    fontSize: 10,
    fontWeight: '700',
  },
  footerBanner: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  footerHint: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 7,
  },
  footerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  footerTime: {
    color: '#8fa597',
    fontSize: 11,
    fontWeight: '600',
  },
});
