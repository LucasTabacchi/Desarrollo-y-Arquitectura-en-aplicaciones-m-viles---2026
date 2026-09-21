import React, { useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { colors, typography, spacing } from '../theme';
import { TacticalButton } from '../ui/TacticalButton';
import { ExportService } from '../services/ExportService';
import { QoSSession, GeoCoordinates, GeoBoundingBox } from '../types';

interface HistoryScreenProps {
  sessions: QoSSession[];
  currentGeo: GeoCoordinates | null;
  onSelectSession: (session: QoSSession) => void;
}

type NetworkFilter = 'ALL' | '5G' | '4G' | 'WIFI';
type DateRange = 'HOY' | '7D' | '30D' | 'TODO';

/**
 * Computes a bounding box ~5km around a center point.
 * Uses approximate conversion: 1° lat ≈ 111 km, 1° lon ≈ 111 km * cos(lat).
 */
function geoBoundingBox(center: GeoCoordinates, radiusKm: number = 5): GeoBoundingBox {
  const latDelta = radiusKm / 111;
  const lonDelta = radiusKm / (111 * Math.cos((center.latitude * Math.PI) / 180));
  return {
    minLat: center.latitude - latDelta,
    maxLat: center.latitude + latDelta,
    minLon: center.longitude - lonDelta,
    maxLon: center.longitude + lonDelta,
  };
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  sessions,
  currentGeo,
  onSelectSession,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<NetworkFilter>('ALL');
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange>('TODO');
  const [geoZoneEnabled, setGeoZoneEnabled] = useState<boolean>(false);
  const [inspectedSessionId, setInspectedSessionId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const toastAnim = useRef(new Animated.Value(-60)).current;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    Animated.timing(toastAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      Animated.timing(toastAnim, {
        toValue: -60,
        duration: 250,
        useNativeDriver: true,
      }).start(() => setToastMessage(null));
    }, 3000);
  };

  // Compute date range bounds
  const dateRangeBounds = useMemo(() => {
    const now = Date.now();
    switch (selectedDateRange) {
      case 'HOY': return { startDate: now - 24 * 60 * 60 * 1000 };
      case '7D': return { startDate: now - 7 * 24 * 60 * 60 * 1000 };
      case '30D': return { startDate: now - 30 * 24 * 60 * 60 * 1000 };
      case 'TODO': return {};
    }
  }, [selectedDateRange]);

  // Compute geo bounding box if enabled
  const geoBox = useMemo<GeoBoundingBox | undefined>(() => {
    if (!geoZoneEnabled || !currentGeo) return undefined;
    return geoBoundingBox(currentGeo, 5);
  }, [geoZoneEnabled, currentGeo]);

  // Apply all filters client-side
  const filtered = useMemo(() => {
    return sessions.filter(s => {
      // Network type filter
      if (selectedFilter !== 'ALL' && !s.networkType.includes(selectedFilter)) return false;
      // Date range filter
      if (dateRangeBounds.startDate && s.timestamp < dateRangeBounds.startDate) return false;
      // Geo zone filter
      if (geoBox) {
        if (s.latitude < geoBox.minLat || s.latitude > geoBox.maxLat) return false;
        if (s.longitude < geoBox.minLon || s.longitude > geoBox.maxLon) return false;
      }
      return true;
    });
  }, [sessions, selectedFilter, dateRangeBounds, geoBox]);

  const handleExportCSV = async () => {
    showToast(`DUMP: ${filtered.length} REGISTROS EXPORTADOS A CSV`);
    const csv = ExportService.toCSV(filtered);
    await ExportService.share(csv, 'qos_telemetry.csv');
  };

  const handleExportJSON = async () => {
    showToast(`STREAM: EXPORTANDO ${filtered.length} SESIONES EN JSON`);
    const json = ExportService.toJSON(filtered);
    await ExportService.share(json, 'qos_telemetry.json');
  };

  const inspectedSession = sessions.find(s => s.id === inspectedSessionId);

  return (
    <View style={styles.container}>
      {/* Toast Notification Banner */}
      {toastMessage && (
        <Animated.View style={[styles.toastBanner, { transform: [{ translateY: toastAnim }] }]}>
          <View style={styles.squareDot} />
          <Text style={styles.toastText} numberOfLines={1}>{toastMessage}</Text>
        </Animated.View>
      )}

      <ScrollView contentContainerStyle={styles.content}>
        {/* 1. STORAGE HEADER */}
        <View style={styles.storageHeader}>
          <View style={styles.storageTitleRow}>
            <View style={styles.pulseDot} />
            <Text style={styles.storageLabel}>STORAGE VOL: /data/user/0/qos.db</Text>
            <Text style={styles.storageEngine}>SQLITE V3</Text>
          </View>
          <View style={styles.storageCountRow}>
            <Text style={styles.countTitle}>{sessions.length} SESIONES ALMACENADAS</Text>
            <Text style={styles.storageUtil}>{(sessions.length * 0.02 + 0.1).toFixed(1)} MB UTIL</Text>
          </View>

          {/* Export Buttons */}
          <View style={styles.exportRow}>
            <TacticalButton
              label="⤓ EXPORTAR CSV"
              variant="primary"
              onPress={handleExportCSV}
              style={{ flex: 1 }}
            />
            <TacticalButton
              label="⤓ EXPORTAR JSON"
              variant="secondary"
              onPress={handleExportJSON}
              style={{ flex: 1 }}
            />
          </View>

          {/* Network Type Quick Filter */}
          <View style={styles.filterRow}>
            <Text style={styles.filterTitle}>FILTRO RED:</Text>
            <View style={styles.filterBtns}>
              {(['ALL', '5G', '4G', 'WIFI'] as const).map(flt => (
                <TouchableOpacity
                  key={flt}
                  style={[
                    styles.filterChip,
                    selectedFilter === flt && styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedFilter(flt)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedFilter === flt && styles.filterChipTextActive,
                    ]}
                  >
                    [{flt}]
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Date Range Filter (RF-09) */}
          <View style={styles.filterRow}>
            <Text style={styles.filterTitle}>VENTANA T:</Text>
            <View style={styles.filterBtns}>
              {(['HOY', '7D', '30D', 'TODO'] as const).map(dr => (
                <TouchableOpacity
                  key={dr}
                  style={[
                    styles.filterChip,
                    selectedDateRange === dr && styles.dateChipActive,
                  ]}
                  onPress={() => setSelectedDateRange(dr)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedDateRange === dr && styles.dateChipTextActive,
                    ]}
                  >
                    [{dr}]
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Geo Zone Filter (RF-09) */}
          <View style={styles.filterRow}>
            <Text style={styles.filterTitle}>ZONA GEO:</Text>
            <TouchableOpacity
              style={[
                styles.geoToggle,
                geoZoneEnabled && styles.geoToggleActive,
              ]}
              onPress={() => setGeoZoneEnabled(!geoZoneEnabled)}
            >
              <Text style={[
                styles.geoToggleText,
                geoZoneEnabled && styles.geoToggleTextActive,
              ]}>
                {geoZoneEnabled ? '◉ ZONA ACTUAL (5km)' : '○ SIN FILTRO GEO'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Active Filters Summary */}
          <View style={styles.filterSummary}>
            <Text style={styles.filterSummaryText}>
              MOSTRANDO: {filtered.length} / {sessions.length} SESIONES
            </Text>
          </View>
        </View>

        {/* 2. INSPECTOR PANEL (WHEN A ROW IS SELECTED) */}
        {inspectedSession && (
          <View style={styles.inspectorCard}>
            <View style={styles.inspectorHeader}>
              <View style={styles.inspectorTitleRow}>
                <View style={[styles.squareDot, { backgroundColor: colors.primary }]} />
                <Text style={styles.inspectorTitle}>TRIAGE // SESIÓN {inspectedSession.id}</Text>
              </View>
              <TouchableOpacity onPress={() => setInspectedSessionId(null)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.deltaGrid}>
              <View style={styles.deltaBox}>
                <Text style={styles.deltaLabel}>RTT PROMEDIO</Text>
                <Text style={[styles.deltaVal, { color: inspectedSession.avgRtt > 60 ? colors.error : colors.secondary }]}>
                  {inspectedSession.avgRtt} ms
                </Text>
              </View>
              <View style={styles.deltaBox}>
                <Text style={styles.deltaLabel}>JITTER RFC2544</Text>
                <Text style={[styles.deltaVal, { color: inspectedSession.jitter > 15 ? colors.error : colors.secondary }]}>
                  {inspectedSession.jitter} ms
                </Text>
              </View>
              <View style={styles.deltaBox}>
                <Text style={styles.deltaLabel}>DOWNLINK (DL)</Text>
                <Text style={[styles.deltaVal, { color: colors.primary }]}>
                  {inspectedSession.downloadMbps.toFixed(1)} Mbps
                </Text>
              </View>
              <View style={styles.deltaBox}>
                <Text style={styles.deltaLabel}>UPLINK (UL)</Text>
                <Text style={[styles.deltaVal, { color: colors.secondary }]}>
                  {inspectedSession.uploadMbps.toFixed(1)} Mbps
                </Text>
              </View>
            </View>

            <TacticalButton
              label="VER TRAZA DETALLADA // TRACE INSPECTOR"
              variant="primary"
              onPress={() => onSelectSession(inspectedSession)}
              style={{ marginTop: spacing.xs }}
            />
          </View>
        )}

        {/* 3. SESSIONS DENSE DATA TABLE */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 1.5 }]}>TIMESTAMP</Text>
            <Text style={[styles.th, { flex: 1.8 }]}>RED/OP</Text>
            <Text style={[styles.th, { flex: 1.2, textAlign: 'right' }]}>RTT AVG</Text>
            <Text style={[styles.th, { flex: 1.2, textAlign: 'right' }]}>JITTER</Text>
            <Text style={[styles.th, { flex: 1.5, textAlign: 'right' }]}>DL / UL</Text>
            <Text style={[styles.th, { flex: 1.2, textAlign: 'center' }]}>ESTADO</Text>
          </View>

          {filtered.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>NO HAY SESIONES REGISTRADAS PARA ESTE FILTRO</Text>
            </View>
          ) : (
            filtered.map((s, idx) => {
              const timeStr = new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const isSelected = s.id === inspectedSessionId;
              return (
                <TouchableOpacity
                  key={s.id}
                  activeOpacity={0.7}
                  onPress={() => setInspectedSessionId(isSelected ? null : s.id)}
                  style={[
                    styles.tableRow,
                    idx % 2 === 1 && styles.tableRowAlt,
                    isSelected && styles.tableRowSelected,
                  ]}
                >
                  <Text style={[styles.td, styles.timeText, { flex: 1.5 }]}>{timeStr}</Text>
                  <View style={{ flex: 1.8 }}>
                    <Text style={styles.opText} numberOfLines={1}>{s.operator}</Text>
                    <Text style={styles.ratText}>{s.networkType}</Text>
                  </View>
                  <Text style={[styles.td, { flex: 1.2, textAlign: 'right', fontWeight: '700', color: colors.onSurface }]}>
                    {s.avgRtt}ms
                  </Text>
                  <Text style={[styles.td, { flex: 1.2, textAlign: 'right', color: colors.onSurfaceVariant }]}>
                    {s.jitter}ms
                  </Text>
                  <Text style={[styles.td, { flex: 1.5, textAlign: 'right', color: colors.primary }]}>
                    {s.downloadMbps.toFixed(0)}/{s.uploadMbps.toFixed(0)}
                  </Text>
                  <View style={{ flex: 1.2, alignItems: 'center' }}>
                    <Text
                      style={[
                        styles.statusBadge,
                        {
                          color: s.status === 'NOMINAL' ? colors.secondary : colors.tertiary,
                          borderColor: s.status === 'NOMINAL' ? colors.secondary : colors.tertiary,
                        },
                      ]}
                    >
                      {s.status === 'NOMINAL' ? 'OK' : 'DEGR'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  toastBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surfaceContainerHighest,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 99,
  },
  toastText: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 9,
    color: colors.primary,
    fontWeight: '700',
  },
  squareDot: {
    width: 6,
    height: 6,
    backgroundColor: colors.secondary,
  },
  storageHeader: {
    backgroundColor: colors.surfaceContainerLow,
    borderColor: colors.outlineVariant,
    borderWidth: 1,
    padding: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  storageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  pulseDot: {
    width: 6,
    height: 6,
    backgroundColor: colors.secondary,
  },
  storageLabel: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 9,
    color: colors.outline,
    flex: 1,
  },
  storageEngine: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 9,
    color: colors.onSurfaceVariant,
    fontWeight: '700',
  },
  storageCountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  countTitle: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  storageUtil: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 10,
    color: colors.tertiary,
    fontWeight: '600',
  },
  exportRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    paddingTop: spacing.xs,
    marginTop: spacing.xs,
  },
  filterTitle: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 9,
    color: colors.outline,
    fontWeight: '600',
  },
  filterBtns: {
    flexDirection: 'row',
    gap: 4,
  },
  filterChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: colors.surfaceContainer,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 9,
    color: colors.onSurfaceVariant,
  },
  filterChipTextActive: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
  dateChipActive: {
    backgroundColor: colors.tertiary,
  },
  dateChipTextActive: {
    color: colors.onTertiary,
    fontWeight: '700',
  },
  geoToggle: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  geoToggleActive: {
    backgroundColor: colors.secondaryContainer,
    borderColor: colors.secondary,
  },
  geoToggleText: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 9,
    color: colors.outline,
    fontWeight: '600',
  },
  geoToggleTextActive: {
    color: colors.onSecondaryContainer,
    fontWeight: '700',
  },
  filterSummary: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  filterSummaryText: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 9,
    color: colors.outline,
    textAlign: 'center',
  },
  inspectorCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderColor: colors.primary,
    borderWidth: 1,
    padding: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  inspectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    paddingBottom: 4,
  },
  inspectorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inspectorTitle: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  closeBtn: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    paddingHorizontal: 4,
  },
  deltaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  deltaBox: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: colors.surfaceContainerLowest,
    padding: 6,
  },
  deltaLabel: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 8,
    color: colors.outline,
  },
  deltaVal: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  table: {
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: colors.outlineVariant,
    borderWidth: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerHigh,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  th: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 8,
    color: colors.outline,
    fontWeight: '700',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  tableRowAlt: {
    backgroundColor: colors.surfaceContainerLow,
  },
  tableRowSelected: {
    backgroundColor: `${colors.primary}26`,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  td: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 9,
    color: colors.onSurfaceVariant,
  },
  timeText: {
    color: colors.outline,
  },
  opText: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 9,
    color: colors.onSurface,
    fontWeight: '700',
  },
  ratText: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 8,
    color: colors.outline,
  },
  statusBadge: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 8,
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  emptyBox: {
    padding: spacing.md,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 9,
    color: colors.outline,
  },
});
