import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { VictoryChart, VictoryLine, VictoryAxis, VictoryTheme, VictoryScatter } from 'victory-native';
import { colors, typography, spacing } from '../theme';
import { RackCard } from '../ui/RackCard';
import { DataMetric } from '../ui/DataMetric';
import { TacticalButton } from '../ui/TacticalButton';
import { ExportService } from '../services/ExportService';
import { QoSSession } from '../types';

interface SessionDetailScreenProps {
  session: QoSSession;
  onBack: () => void;
}

const CHART_WIDTH = Dimensions.get('window').width - (spacing.md * 2) - (spacing.sm * 2) - 4;

/**
 * Generates synthetic time series data from session stats for visualization.
 * When real samples are available, uses those instead.
 */
function generateRttSeries(session: QoSSession): { x: number; y: number }[] {
  if (session.samples && session.samples.length > 0) {
    return session.samples
      .filter(s => s.phase === 'PING')
      .map((s, i) => ({ x: i, y: s.metricValue }));
  }

  // Generate synthetic jitter-modulated series from session stats
  const count = 12;
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    // Simulate RTT with jitter variation around avg
    const jitterComponent = session.jitter * Math.sin(t * Math.PI * 3 + i);
    const spike = i === 5 ? session.maxRtt - session.avgRtt : 0;
    const value = Math.max(0, session.avgRtt + jitterComponent + spike);
    points.push({ x: i * (30 / (count - 1)), y: Number(value.toFixed(1)) });
  }
  return points;
}

function generateThroughputSeries(session: QoSSession, type: 'dl' | 'ul'): { x: number; y: number }[] {
  if (session.samples && session.samples.length > 0) {
    const phase = type === 'dl' ? 'DOWNLOAD' : 'UPLOAD';
    return session.samples
      .filter(s => s.phase === phase)
      .map((s, i) => ({ x: i, y: s.metricValue }));
  }

  // Synthetic ramp-up curve typical of throughput tests
  const target = type === 'dl' ? session.downloadMbps : session.uploadMbps;
  const count = 10;
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    // Logistic ramp-up: slow start → full speed → slight variation
    const ramp = target / (1 + Math.exp(-8 * (t - 0.3)));
    const noise = (Math.random() - 0.5) * target * 0.05;
    points.push({ x: i * (30 / (count - 1)), y: Number(Math.max(0, ramp + noise).toFixed(1)) });
  }
  return points;
}

export const SessionDetailScreen: React.FC<SessionDetailScreenProps> = ({
  session,
  onBack,
}) => {
  const rttData = useMemo(() => generateRttSeries(session), [session]);
  const dlData = useMemo(() => generateThroughputSeries(session, 'dl'), [session]);
  const ulData = useMemo(() => generateThroughputSeries(session, 'ul'), [session]);

  // Find the peak point for RTT
  const peakPoint = useMemo(() => {
    return rttData.reduce((max, p) => p.y > max.y ? p : max, rttData[0]);
  }, [rttData]);

  const handleExportJson = async () => {
    const json = JSON.stringify(session, null, 2);
    await ExportService.share(json, `session_${session.id}.json`);
  };

  const nocAxisStyle = {
    axis: { stroke: colors.outlineVariant, strokeWidth: 0.5 },
    tickLabels: {
      fill: colors.outline,
      fontSize: 8,
      fontFamily: typography.fontFamilyMono,
    },
    grid: { stroke: colors.scopeGrid, strokeWidth: 0.5, strokeDasharray: '2,2' },
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 1. BACK HEADER */}
      <View style={styles.navHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backText}>◀ VOLVER AL LOG</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>PACKET TRACE INSPECTOR</Text>
      </View>

      {/* 2. SESSION METADATA RACK */}
      <RackCard
        title={`SESIÓN // ID: ${session.id}`}
        tag={session.status}
        tagColor={session.status === 'NOMINAL' ? colors.secondary : colors.tertiary}
      >
        <View style={styles.metaGrid}>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>INTERFAZ / CANAL</Text>
            <Text style={styles.metaValPrimary}>{session.networkType}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>OPERADOR</Text>
            <Text style={styles.metaVal}>{session.operator}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>GEOPOSICIÓN GPS</Text>
            <Text style={styles.metaVal}>{session.latitude.toFixed(4)}, {session.longitude.toFixed(4)}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>POTENCIA RSSI</Text>
            <Text style={[styles.metaVal, { color: colors.secondary }]}>{session.signalDbm} dBm</Text>
          </View>
        </View>
      </RackCard>

      {/* 3. SYNCHRONIZED TIME SERIES GRAPHS (RF-06) — victory-native */}
      <RackCard title="SERIES TEMPORALES SINCRONIZADAS" tag="SAMPLES @ 250ms">
        {/* Graph 1: Latency RTT */}
        <View style={styles.graphContainer}>
          <View style={styles.graphHeader}>
            <Text style={styles.graphTitle}>GRAF 1: LATENCIA RTT (ms)</Text>
            <Text style={styles.graphHighlight}>PEAK: {session.maxRtt}ms</Text>
          </View>
          <View style={styles.svgBox}>
            <VictoryChart
              width={CHART_WIDTH}
              height={80}
              padding={{ top: 8, bottom: 20, left: 32, right: 8 }}
              theme={VictoryTheme.material}
            >
              <VictoryAxis
                dependentAxis
                style={nocAxisStyle}
                tickFormat={(t: number) => `${t}`}
              />
              <VictoryAxis
                style={nocAxisStyle}
                tickFormat={(t: number) => `${t.toFixed(0)}s`}
              />
              <VictoryLine
                data={rttData}
                style={{
                  data: {
                    stroke: colors.primary,
                    strokeWidth: 2,
                  },
                }}
                interpolation="monotoneX"
              />
              {/* Peak marker */}
              <VictoryScatter
                data={[peakPoint]}
                size={4}
                style={{
                  data: { fill: colors.error },
                }}
              />
            </VictoryChart>
          </View>
        </View>

        {/* Graph 2: Throughput DL & UL */}
        <View style={styles.graphContainer}>
          <View style={styles.graphHeader}>
            <Text style={styles.graphTitle}>GRAF 2: THROUGHPUT DL / UL (Mbps)</Text>
            <Text style={[styles.graphHighlight, { color: colors.secondary }]}>DL: {session.downloadMbps} Mbps</Text>
          </View>
          <View style={styles.svgBox}>
            <VictoryChart
              width={CHART_WIDTH}
              height={80}
              padding={{ top: 8, bottom: 20, left: 32, right: 8 }}
              theme={VictoryTheme.material}
            >
              <VictoryAxis
                dependentAxis
                style={nocAxisStyle}
                tickFormat={(t: number) => `${t}`}
              />
              <VictoryAxis
                style={nocAxisStyle}
                tickFormat={(t: number) => `${t.toFixed(0)}s`}
              />
              <VictoryLine
                data={dlData}
                style={{
                  data: {
                    stroke: colors.secondary,
                    strokeWidth: 2,
                  },
                }}
                interpolation="monotoneX"
              />
              <VictoryLine
                data={ulData}
                style={{
                  data: {
                    stroke: colors.outline,
                    strokeWidth: 1.2,
                  },
                }}
                interpolation="monotoneX"
              />
            </VictoryChart>
          </View>
          <View style={styles.graphLegendRow}>
            <Text style={[styles.legendText, { color: colors.secondary }]}>■ DL STREAM</Text>
            <Text style={[styles.legendText, { color: colors.outline }]}>■ UL STREAM</Text>
          </View>
        </View>
      </RackCard>

      {/* 4. TELEMETRIC MAGNITUDE RACK */}
      <RackCard title="RACK TELEMÉTRICO DE MAGNITUDES" tag="SLA METRICS">
        <View style={styles.statsGrid}>
          <DataMetric
            label="RTT Promedio"
            value={session.avgRtt}
            unit="ms"
            sublabel={`MIN: ${session.minRtt} | MAX: ${session.maxRtt}`}
            color={colors.primary}
          />
          <DataMetric
            label="Jitter / Dispersión"
            value={session.jitter}
            unit="ms"
            sublabel={session.jitter < 10 ? 'ESTABLE' : 'INESTABLE'}
            color={session.jitter < 10 ? colors.secondary : colors.tertiary}
          />
        </View>
        <View style={[styles.statsGrid, { marginTop: spacing.xs }]}>
          <DataMetric
            label="Throughput DL"
            value={session.downloadMbps.toFixed(1)}
            unit="Mbps"
            sublabel={`UL: ${session.uploadMbps.toFixed(1)} Mbps`}
            color={colors.secondary}
          />
          <DataMetric
            label="Pérdida de Paquetes"
            value={`${session.lossPercent.toFixed(1)}%`}
            sublabel={session.lossPercent === 0 ? '0 DESCARTES' : 'PAQUETES PERDIDOS'}
            color={session.lossPercent === 0 ? colors.secondary : colors.error}
          />
        </View>
      </RackCard>

      {/* 5. EXPORT SESSION BUTTON */}
      <TacticalButton
        label="⤓ EXPORTAR LOG COMPLETO JSON"
        variant="primary"
        onPress={handleExportJson}
        style={{ marginBottom: spacing.lg }}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  navHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  backBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  backText: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 9,
    color: colors.primary,
    fontWeight: '700',
  },
  navTitle: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 9,
    color: colors.outline,
    fontWeight: '600',
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  metaCell: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  metaLabel: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 8,
    color: colors.outline,
  },
  metaVal: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 11,
    fontWeight: '700',
    color: colors.onSurface,
    marginTop: 2,
  },
  metaValPrimary: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 2,
  },
  graphContainer: {
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginBottom: spacing.sm,
  },
  graphHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  graphTitle: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 9,
    color: colors.onSurface,
    fontWeight: '600',
  },
  graphHighlight: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 9,
    color: colors.error,
    fontWeight: '700',
  },
  svgBox: {
    height: 80,
    backgroundColor: colors.scopeBg,
  },
  graphLegendRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  legendText: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 8,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
});
