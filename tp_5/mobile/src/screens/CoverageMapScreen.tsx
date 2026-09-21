import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import MapView, { Heatmap, Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { colors, typography, spacing } from '../theme';
import { TacticalButton } from '../ui/TacticalButton';
import { GeoCoordinates, QoSSession, NetworkStateInfo } from '../types';
import { GeodeticUtils } from '../utils/GeodeticUtils';

interface CoverageMapScreenProps {
  currentGeo: GeoCoordinates | null;
  sessions: QoSSession[];
  networkState: NetworkStateInfo | null;
  onManualSample: () => void;
}

type TechFilter = 'ALL' | '5G' | '4G' | 'WIFI';
type MetricFilter = 'RSSI' | 'RTT' | 'THROUGHPUT';
type WindowFilter = '24H' | '7D' | 'HIST';

/**
 * Computes the heatmap weight for a given session based on the selected metric.
 * Higher weight = worse quality (red), lower weight = better quality (green).
 */
function computeHeatWeight(session: QoSSession, metric: MetricFilter): number {
  switch (metric) {
    case 'RSSI':
      // Signal: -60 dBm (excellent) to -120 dBm (dead zone). Normalize inverted.
      return Math.max(0.1, Math.min(1.0, (Math.abs(session.signalDbm) - 60) / 60));
    case 'RTT':
      // RTT: 0ms (excellent) to 200ms (terrible)
      return Math.max(0.1, Math.min(1.0, session.avgRtt / 200));
    case 'THROUGHPUT':
      // Throughput: inverted — 500 Mbps (excellent) to 0 Mbps (dead)
      return Math.max(0.1, Math.min(1.0, 1 - session.downloadMbps / 500));
  }
}

/**
 * Returns marker color based on session status.
 */
function statusColor(status: string): string {
  switch (status) {
    case 'NOMINAL': return colors.secondary;
    case 'DEGRADED': return colors.tertiary;
    case 'CRITICAL': return colors.error;
    default: return colors.outline;
  }
}

export const CoverageMapScreen: React.FC<CoverageMapScreenProps> = ({
  currentGeo,
  sessions,
  networkState: _networkState,
  onManualSample,
}) => {
  const [selectedTech, setSelectedTech] = useState<TechFilter>('ALL');
  const [selectedMetric, setSelectedMetric] = useState<MetricFilter>('RSSI');
  const [selectedWindow, setSelectedWindow] = useState<WindowFilter>('24H');
  const [isSampling, setIsSampling] = useState<boolean>(false);

  const lat = currentGeo?.latitude ?? -34.603722;
  const lon = currentGeo?.longitude ?? -58.381592;
  const alt = currentGeo?.altitude ? currentGeo.altitude.toFixed(1) : '24.1';
  const accuracy = currentGeo?.accuracy ? currentGeo.accuracy.toFixed(1) : '1.2';
  const dmsLat = GeodeticUtils.toDMS(lat, true);
  const dmsLon = GeodeticUtils.toDMS(lon, false);

  const initialRegion: Region = {
    latitude: lat,
    longitude: lon,
    latitudeDelta: 0.015,
    longitudeDelta: 0.015,
  };

  // Filter sessions by tech and time window
  const filteredSessions = useMemo(() => {
    const now = Date.now();
    let windowMs = 0;
    switch (selectedWindow) {
      case '24H': windowMs = 24 * 60 * 60 * 1000; break;
      case '7D': windowMs = 7 * 24 * 60 * 60 * 1000; break;
      case 'HIST': windowMs = 0; break; // all history
    }

    return sessions.filter(s => {
      if (selectedTech !== 'ALL' && !s.networkType.includes(selectedTech)) return false;
      if (windowMs > 0 && s.timestamp < now - windowMs) return false;
      return s.latitude !== 0 && s.longitude !== 0;
    });
  }, [sessions, selectedTech, selectedWindow]);

  // Generate heatmap points
  const heatmapPoints = useMemo(() => {
    return filteredSessions.map(s => ({
      latitude: s.latitude,
      longitude: s.longitude,
      weight: computeHeatWeight(s, selectedMetric),
    }));
  }, [filteredSessions, selectedMetric]);

  const sampleCount = filteredSessions.length;

  const handleManualSample = () => {
    setIsSampling(true);
    onManualSample();
    setTimeout(() => {
      setIsSampling(false);
    }, 2000);
  };

  return (
    <View style={styles.container}>
      {/* 1. SUB-HEADER TECHNICAL BAR: LAYER MATRIX & FILTERS */}
      <View style={styles.filterSection}>
        {/* Network Layer Selector (CAPA RF) */}
        <View style={styles.filterRow}>
          <View style={styles.labelWithDot}>
            <View style={styles.squareDot} />
            <Text style={styles.filterLabel}>CAPA RF</Text>
          </View>
          <View style={styles.buttonGroup}>
            {(['ALL', '5G', '4G', 'WIFI'] as const).map(tech => (
              <TouchableOpacity
                key={tech}
                style={[
                  styles.filterBtn,
                  selectedTech === tech && styles.filterBtnActive,
                ]}
                onPress={() => setSelectedTech(tech)}
              >
                <Text
                  style={[
                    styles.filterBtnText,
                    selectedTech === tech && styles.filterBtnTextActive,
                  ]}
                >
                  {tech === 'ALL' ? 'TODAS' : tech === '5G' ? '5G NR' : tech === '4G' ? '4G LTE' : 'WIFI 6'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Metric Selector (MÉTRICA) */}
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>MÉTRICA</Text>
          <View style={styles.buttonGroup}>
            {(['RSSI', 'RTT', 'THROUGHPUT'] as const).map(met => (
              <TouchableOpacity
                key={met}
                style={[
                  styles.filterBtnDense,
                  selectedMetric === met && styles.metricBtnActive,
                ]}
                onPress={() => setSelectedMetric(met)}
              >
                <Text
                  style={[
                    styles.filterBtnText,
                    selectedMetric === met && styles.metricBtnTextActive,
                  ]}
                >
                  {met === 'RSSI' ? 'RSRP/RSSI' : met === 'RTT' ? 'RTT LAT' : 'THROUGHPUT'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Time Horizon (VENTANA T) */}
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>VENTANA T</Text>
          <View style={styles.buttonGroup}>
            {(['24H', '7D', 'HIST'] as const).map(win => (
              <TouchableOpacity
                key={win}
                style={[
                  styles.filterBtnDense,
                  selectedWindow === win && styles.windowBtnActive,
                ]}
                onPress={() => setSelectedWindow(win)}
              >
                <Text
                  style={[
                    styles.filterBtnText,
                    selectedWindow === win && styles.windowBtnTextActive,
                  ]}
                >
                  {win === '24H' ? '24H LIVE' : win === '7D' ? '7 DÍAS' : 'HISTÓRICO'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* 2. INTERACTIVE MAP WITH HEATMAP OVERLAY (react-native-maps) */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          initialRegion={initialRegion}
          showsUserLocation
          showsMyLocationButton
          mapType="standard"
        >
          {/* Heatmap overlay weighted by selected metric */}
          {heatmapPoints.length > 0 && (
            <Heatmap
              points={heatmapPoints}
              radius={40}
              opacity={0.7}
              gradient={{
                colors: [colors.secondary, colors.tertiary, colors.error],
                startPoints: [0.2, 0.5, 0.8],
                colorMapSize: 256,
              }}
            />
          )}

          {/* Session measurement markers */}
          {filteredSessions.map(s => (
            <Marker
              key={s.id}
              coordinate={{ latitude: s.latitude, longitude: s.longitude }}
              title={`${s.id} — ${s.networkType}`}
              description={`RTT: ${s.avgRtt}ms | DL: ${s.downloadMbps} Mbps | ${s.status}`}
              pinColor={statusColor(s.status)}
            />
          ))}
        </MapView>

        {/* HUD Overlay: Reference System Badge */}
        <View style={styles.hudTopLeft}>
          <Text style={styles.hudBadge}>REF: WGS-84 // EPSG:4326</Text>
          <Text style={styles.hudBadge}>PUNTOS: {sampleCount}</Text>
        </View>

        {/* Legend Widget */}
        <View style={styles.hudTopRight}>
          <View style={styles.legendRow}>
            <View style={[styles.legendBox, { backgroundColor: colors.secondary }]} />
            <Text style={styles.legendText}>{selectedMetric === 'RSSI' ? '> -85 dBm [ÓPT]' : selectedMetric === 'RTT' ? '< 30ms [ÓPT]' : '> 100 Mbps [ÓPT]'}</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendBox, { backgroundColor: colors.tertiary }]} />
            <Text style={styles.legendText}>{selectedMetric === 'RSSI' ? '-85 a -105 [MED]' : selectedMetric === 'RTT' ? '30-100ms [MED]' : '10-100 Mbps [MED]'}</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendBox, { backgroundColor: colors.error }]} />
            <Text style={styles.legendText}>{selectedMetric === 'RSSI' ? '< -105 dBm [SOM]' : selectedMetric === 'RTT' ? '> 100ms [CRIT]' : '< 10 Mbps [CRIT]'}</Text>
          </View>
        </View>
      </View>

      {/* 3. LOWER TACTICAL DIAGNOSTIC PANEL (GIS DRIVE-TEST HUD) */}
      <ScrollView style={styles.tacticalScroll} contentContainerStyle={styles.tacticalContent}>
        {/* Telemetry Geodetic Header Line */}
        <View style={styles.gnssHeaderBlock}>
          <View style={styles.gnssTitleRow}>
            <View style={styles.gnssTitleLeft}>
              <Text style={{ color: colors.tertiary, fontSize: 13 }}>◎</Text>
              <Text style={styles.gnssTitleText}>FIX GNSS TELEMETRÍA</Text>
            </View>
            <View style={styles.hdopRow}>
              <Text style={styles.hdopLabel}>HDOP:</Text>
              <Text style={styles.hdopValue}>0.8 [EXCELENTE]</Text>
            </View>
          </View>

          <View style={styles.gnssDataGrid}>
            <View style={styles.gnssDataCol}>
              <Text style={styles.gnssFieldLabel}>COORDENADAS</Text>
              <Text style={styles.gnssFieldValue}>{dmsLat}</Text>
              <Text style={styles.gnssFieldValue}>{dmsLon}</Text>
            </View>
            <View style={styles.gnssDataCol}>
              <View>
                <Text style={styles.gnssFieldLabel}>ALTITUD ORTOMÉTRICA</Text>
                <Text style={styles.gnssFieldValue}>{alt} m ASL</Text>
              </View>
              <View style={styles.epsRow}>
                <Text style={styles.gnssFieldLabel}>EPS:</Text>
                <Text style={styles.epsValue}>±{accuracy}m</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Sample Ledger Meta Strip */}
        <View style={styles.sampleLedgerStrip}>
          <View style={styles.ledgerLeft}>
            <Text style={{ color: colors.primary, fontSize: 12 }}>⁖</Text>
            <Text style={styles.ledgerCountText}>
              {sampleCount.toLocaleString()} PUNTOS REGISTRADOS
            </Text>
          </View>
          <View style={styles.ledgerRight}>
            <View style={[styles.squareDot, { backgroundColor: colors.secondary }]} />
            <Text style={styles.ledgerNominalText}>
              {filteredSessions.filter(s => s.status === 'NOMINAL').length} NOMINAL
            </Text>
          </View>
        </View>

        {/* Direct Push Hardware Action Trigger */}
        <TacticalButton
          label={isSampling
            ? `CAPTURADO [MUESTRA #${sampleCount + 1}]`
            : 'FORZAR MUESTREO EN PUNTO ACTUAL'}
          icon={isSampling ? 'save' : 'location'}
          variant={isSampling ? 'secondary' : 'primary'}
          onPress={handleManualSample}
          style={{ marginVertical: spacing.md }}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  filterSection: {
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelWithDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  squareDot: {
    width: 6,
    height: 6,
    backgroundColor: colors.primary,
  },
  filterLabel: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 9,
    color: colors.outline,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 4,
  },
  filterBtn: {
    backgroundColor: colors.surfaceContainerHighest,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  filterBtnActive: {
    backgroundColor: colors.primary,
  },
  filterBtnDense: {
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  metricBtnActive: {
    backgroundColor: colors.secondary,
  },
  windowBtnActive: {
    backgroundColor: colors.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  filterBtnText: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 9,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  filterBtnTextActive: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
  metricBtnTextActive: {
    color: colors.onSecondary,
    fontWeight: '700',
  },
  windowBtnTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  hudTopLeft: {
    position: 'absolute',
    top: 8,
    left: 8,
    gap: 4,
    zIndex: 10,
  },
  hudTopRight: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: `${colors.surfaceContainerLowest}E6`,
    padding: 6,
    gap: 3,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    zIndex: 10,
  },
  hudBadge: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 8,
    color: colors.outline,
    backgroundColor: `${colors.surfaceContainerLowest}CC`,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendBox: {
    width: 8,
    height: 8,
  },
  legendText: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 8,
    color: colors.onSurfaceVariant,
  },
  tacticalScroll: {
    maxHeight: 200,
    backgroundColor: colors.surfaceContainerLowest,
  },
  tacticalContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  gnssHeaderBlock: {
    backgroundColor: colors.surfaceContainer,
    padding: spacing.xs + 2,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  gnssTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gnssTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gnssTitleText: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 9,
    color: colors.onSurface,
    fontWeight: '600',
  },
  hdopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hdopLabel: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 8,
    color: colors.outline,
  },
  hdopValue: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 9,
    color: colors.secondary,
    fontWeight: '700',
  },
  gnssDataGrid: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  gnssDataCol: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
    padding: 6,
    justifyContent: 'space-between',
  },
  gnssFieldLabel: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 8,
    color: colors.outline,
  },
  gnssFieldValue: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 10,
    color: colors.onSurface,
    fontWeight: '600',
    marginTop: 1,
  },
  epsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  epsValue: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 9,
    color: colors.secondary,
    fontWeight: '700',
  },
  sampleLedgerStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    padding: spacing.xs + 2,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  ledgerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ledgerCountText: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 9,
    color: colors.onSurface,
    fontWeight: '600',
  },
  ledgerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ledgerNominalText: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 9,
    color: colors.secondary,
    fontWeight: '700',
  },
  samplePushBtn: {
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: spacing.sm + 2,
    alignItems: 'center',
  },
  samplePushBtnActive: {
    backgroundColor: colors.secondaryContainer,
    borderColor: colors.secondary,
  },
  samplePushBtnText: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  samplePushBtnTextActive: {
    color: colors.onSecondaryContainer,
  },
});
