import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useFocusEffect, useRouter } from 'expo-router';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { computePlotStatus, DEFAULT_STALE_AGE_MS, formatReadingAge, isPointInPolygon, polygonToMapCoordinates, type MapCoordinate, type PlotStatus } from '@/lib/plot-geometry';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/providers/organization-provider';
import { registerAutoFlush } from '@/lib/offline-queue';
import { PlotCard } from '@/components/plot-card';

const LOAD_TIMEOUT_MS = 15_000;
const statusMeta: Record<PlotStatus, { label: string; color: string; fill: string }> = {
  stale: { label: 'Sin datos', color: '#94a3b8', fill: 'rgba(148, 163, 184, 0.16)' },
  dry: { label: 'Seco', color: '#ef4444', fill: 'rgba(239, 68, 68, 0.28)' },
  optimal: { label: 'Óptimo', color: '#22c55e', fill: 'rgba(34, 197, 94, 0.28)' },
  wet: { label: 'Húmedo', color: '#3b82f6', fill: 'rgba(59, 130, 246, 0.28)' },
};

type Reading = { measured_at: string; soil_moisture_pct: number; air_temperature_c: number | null };
type Plot = { id: string; name: string; crop: string | null; boundary: unknown; threshold_min: number; threshold_max: number; stations: { id: string; name: string; external_id: string | null; readings: Reading[] }[] };

function getPolygonCenter(coordinates: MapCoordinate[]): MapCoordinate {
  if (!coordinates.length) return { latitude: 0, longitude: 0 };
  let latSum = 0;
  let lngSum = 0;
  for (const pt of coordinates) {
    latSum += pt.latitude;
    lngSum += pt.longitude;
  }
  return {
    latitude: latSum / coordinates.length,
    longitude: lngSum / coordinates.length,
  };
}

function NativeMap({
  plots,
  position,
  onSelect,
  onCenterPosition,
}: {
  plots: Plot[];
  position: MapCoordinate | null;
  onSelect: (plot: Plot) => void;
  onCenterPosition: () => void;
}) {
  const mapRef = useRef<React.ElementRef<typeof import('react-native-maps').default>>(null);
  const [mapType, setMapType] = useState<'hybrid' | 'standard'>('hybrid');

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webMap}>
        <Text style={styles.mapFallbackTitle}>Vista previa del mapa</Text>
        <Text style={styles.mapFallbackText}>
          Abrí AgroPulse en iOS o Android para explorar los límites de los lotes.
        </Text>
      </View>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const maps = require('react-native-maps') as typeof import('react-native-maps');
  const MapView = maps.default;
  const { Marker, Polygon } = maps;

  const polygons = plots
    .map((plot) => ({ plot, coordinates: polygonToMapCoordinates(plot.boundary) }))
    .filter(({ coordinates }) => coordinates.length >= 3);
  const allCoordinates = polygons.flatMap(({ coordinates }) => coordinates);
  const fallback = allCoordinates[0] ?? { latitude: -31.391, longitude: -58.397 };

  function fitMap() {
    if (allCoordinates.length) {
      mapRef.current?.fitToCoordinates(allCoordinates, {
        edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
        animated: true,
      });
    }
  }

  return (
    <View style={styles.mapContainer}>
      <MapView
        ref={mapRef}
        provider={maps.PROVIDER_GOOGLE}
        mapType={mapType}
        style={styles.map}
        initialRegion={{ ...fallback, latitudeDelta: 0.006, longitudeDelta: 0.006 }}
        onMapReady={fitMap}
        onLayout={fitMap}
        showsUserLocation={Boolean(position)}
      >
        {polygons.map(({ plot, coordinates }) => {
          const status = computeStatus(plot);
          const center = getPolygonCenter(coordinates);
          const reading = latestReading(plot);
          let statusSubtitle = statusMeta[status].label;
          if (status === 'optimal' && reading?.soil_moisture_pct != null) {
            statusSubtitle = `Óptimo (${Math.round(reading.soil_moisture_pct)}%)`;
          } else if (status === 'dry' && reading?.soil_moisture_pct != null) {
            statusSubtitle = `Seco (${Math.round(reading.soil_moisture_pct)}%) ⚠️`;
          } else if (status === 'wet' && reading?.soil_moisture_pct != null) {
            statusSubtitle = `Húmedo (${Math.round(reading.soil_moisture_pct)}%)`;
          } else {
            statusSubtitle = 'Sin Datos';
          }

          const isStale = status === 'stale';

          const plotKey = `${plot.id}-${status}-${reading?.measured_at ?? 'no-reading'}`;

          return (
            <Fragment key={plotKey}>
              <Polygon
                key={`poly-${plotKey}`}
                coordinates={coordinates}
                fillColor={statusMeta[status].fill}
                strokeColor={statusMeta[status].color}
                strokeWidth={2.5}
                lineDashPattern={isStale ? [6, 6] : undefined}
                tappable
                onPress={() => onSelect(plot)}
              />
              <Marker
                key={`marker-${plotKey}`}
                coordinate={center}
                anchor={{ x: 0.5, y: 0.5 }}
                onPress={() => onSelect(plot)}
              >
                <View style={styles.calloutPill}>
                  <View style={[styles.calloutDot, { backgroundColor: statusMeta[status].color }]} />
                  <View style={styles.calloutTextCol}>
                    <Text style={styles.calloutName}>{plot.name}</Text>
                    <Text style={[styles.calloutStatus, { color: statusMeta[status].color }]}>
                      {statusSubtitle}
                    </Text>
                  </View>
                </View>
              </Marker>
            </Fragment>
          );
        })}
        {position && <Marker coordinate={position} title="Tu posición" pinColor="#22c55e" />}
      </MapView>

      {/* Floating Top-Right Controls */}
      <View style={styles.mapControlsTopRight}>
        <Pressable
          onPress={() => setMapType((prev) => (prev === 'hybrid' ? 'standard' : 'hybrid'))}
          style={styles.mapControlButton}
          accessibilityLabel="Cambiar capa del mapa"
        >
          <Ionicons name="layers" size={18} color="#dee4df" />
        </Pressable>
        <Pressable
          onPress={fitMap}
          style={styles.mapControlButton}
          accessibilityLabel="Centrar en lotes"
        >
          <Ionicons name="navigate" size={18} color="#dee4df" />
        </Pressable>
      </View>

      {/* Floating Bottom-Right Location Button */}
      <Pressable
        style={styles.locationButton}
        onPress={onCenterPosition}
        accessibilityLabel="Mi ubicación"
      >
        <Ionicons name="locate" color="#003824" size={16} />
        <Text style={styles.locationButtonText}>Mi ubicación</Text>
      </Pressable>
    </View>
  );
}

function latestReading(plot: Plot): Reading | null {
  const all = (plot.stations ?? [])
    .flatMap((s) => s.readings ?? [])
    .filter((r) => r && r.measured_at && Number.isFinite(Number(r.soil_moisture_pct)))
    .sort((a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime());
  return all[0] ?? null;
}

function computeStatus(plot: Plot): PlotStatus {
  const reading = latestReading(plot);
  return computePlotStatus(
    reading?.soil_moisture_pct ?? null,
    reading?.measured_at ?? null,
    Number(plot.threshold_min),
    Number(plot.threshold_max),
    Date.now(),
    DEFAULT_STALE_AGE_MS,
  );
}

export default function MapScreen() {
  const router = useRouter();
  const {
    selectedOrgId,
    selectedOrganization,
    isLoading: isOrgLoading,
    error: orgError,
    refreshOrganizations,
  } = useOrganization();
  const [plots, setPlots] = useState<Plot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [position, setPosition] = useState<MapCoordinate | null>(null);

  useEffect(() => { registerAutoFlush(); }, []);

  const loadData = useCallback(async (organizationId?: string | null) => {
    if (!organizationId) { setPlots([]); setIsLoading(false); return; }
    setError(null);
    const timeout = setTimeout(() => {
      setIsLoading(false);
      setIsRefreshing(false);
      setError('Tiempo de espera agotado. Deslizá hacia abajo para reintentar.');
    }, LOAD_TIMEOUT_MS);
    try {
      const result = await supabase
        .from('plots')
        .select('id, name, crop, boundary, threshold_min, threshold_max, stations(id, name, external_id, readings(measured_at, soil_moisture_pct, air_temperature_c))')
        .eq('organization_id', organizationId);
      clearTimeout(timeout);
      if (result.error) {
        setError('No se pudieron cargar los lotes. Comprobá tu conexión e intentá de nuevo.');
      } else {
        setPlots(
          (result.data ?? []).map((plot) => ({
            ...(plot as unknown as Plot),
            stations: (plot as unknown as Plot).stations.map((station) => ({
              ...station,
              readings: [...station.readings].sort(
                (a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime()
              ),
            })),
          }))
        );
      }
    } catch {
      clearTimeout(timeout);
      setError('No se pudieron cargar los lotes. Comprobá tu conexión e intentá de nuevo.');
    }
    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    if (selectedOrgId) {
      setIsLoading(true);
      void loadData(selectedOrgId);
    } else if (!isOrgLoading) {
      setPlots([]);
      setIsLoading(false);
    }
  }, [selectedOrgId, isOrgLoading, loadData]);

  // Realtime subscription for readings and plots to keep map live
  useEffect(() => {
    if (!selectedOrgId) return;
    let active = true;
    const channel = supabase
      .channel(`map-sync-${selectedOrgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'readings' }, () => {
        if (active) void loadData(selectedOrgId);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plots', filter: `organization_id=eq.${selectedOrgId}` }, () => {
        if (active) void loadData(selectedOrgId);
      })
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [selectedOrgId, loadData]);

  useFocusEffect(
    useCallback(() => {
      if (selectedOrgId) {
        void loadData(selectedOrgId);
      }
    }, [selectedOrgId, loadData])
  );

  async function centerOnPosition() {
    setLocationMessage(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setLocationMessage('No se otorgó acceso a la ubicación. El mapa sigue disponible sin ella.');
        return;
      }
      let current = await Location.getLastKnownPositionAsync();
      if (!current) {
        current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      }
      if (!current) {
        setLocationMessage('No pudimos determinar tu posición. Verificá que el GPS del emulador esté enviando señal.');
        return;
      }
      const next = { latitude: current.coords.latitude, longitude: current.coords.longitude };
      setPosition(next);
      setLocationMessage(
        plots.some((plot) => isPointInPolygon(next, polygonToMapCoordinates(plot.boundary)))
          ? 'Estás dentro de uno de tus lotes.'
          : 'Estás fuera de los lotes disponibles.'
      );
    } catch (err) {
      console.warn('Location error:', err);
      setLocationMessage('No pudimos determinar tu posición. El mapa sigue disponible.');
    }
  }

  const summary = useMemo(() => plots.reduce((counts, plot) => {
    counts[computeStatus(plot)] += 1;
    return counts;
  }, { stale: 0, dry: 0, optimal: 0, wet: 0 } as Record<PlotStatus, number>), [plots]);

  const totalPlots = plots.length;
  const organizationName = selectedOrganization?.name;
  const displayLoading = isLoading || isOrgLoading;
  const displayError = error || orgError;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              void Promise.all([loadData(selectedOrgId), refreshOrganizations()]);
            }}
            tintColor="#22c55e"
          />
        }
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <View style={styles.brandRow}>
              <View style={styles.brandMark}>
                <Ionicons name="map" color="#22c55e" size={18} />
              </View>
              <Text style={styles.eyebrow}>AGROPULSE / VISTA DE CAMPO</Text>
            </View>
            <Text style={styles.title}>Monitoreo de Lotes</Text>
          </View>
        </View>

        {displayLoading && <ActivityIndicator color="#22c55e" size="large" style={styles.loader} />}
        {displayError && <Text accessibilityLiveRegion="polite" style={styles.error}>{displayError}</Text>}

        {!displayLoading && !displayError && !selectedOrgId && (
          <View style={styles.empty}>
            <Text style={styles.cardTitle}>Elegí un establecimiento</Text>
            <Text style={styles.cardText}>Seleccioná un establecimiento para ver sus lotes.</Text>
          </View>
        )}

        {!displayLoading && !displayError && selectedOrgId && plots.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.cardTitle}>Sin lotes aún</Text>
            <Text style={styles.cardText}>No hay lotes en {organizationName ?? 'este establecimiento'}.</Text>
          </View>
        )}

        {!displayLoading && !displayError && selectedOrgId && plots.length > 0 && (
          <>
            <View style={styles.mapCard}>
              <NativeMap
                plots={plots}
                position={position}
                onSelect={(plot) => router.push({ pathname: '/plot/[id]', params: { id: plot.id, organizationId: selectedOrgId } })}
                onCenterPosition={() => void centerOnPosition()}
              />
            </View>
            {locationMessage && <Text style={styles.locationMessage}>{locationMessage}</Text>}

            <View style={styles.statusPanel}>
              <View style={styles.statusPanelTop}>
                <View>
                  <View style={styles.legendHeader}>
                    <Ionicons name="pulse" color="#22c55e" size={18} />
                    <Text style={styles.label}>ESTADO DEL CAMPO</Text>
                  </View>
                  <Text style={styles.statusPanelTitle}>Estado de lotes en vivo</Text>
                </View>
                <Text style={styles.statusTotal}>{totalPlots}</Text>
              </View>

              <View style={styles.statusGrid}>
                {Object.entries(statusMeta).map(([status, meta]) => {
                  const count = summary[status as PlotStatus];
                  const percent = totalPlots ? Math.round((count / totalPlots) * 100) : 0;
                  return (
                    <View key={status} style={styles.statusTile}>
                      <View style={styles.statusTileTop}>
                        <View style={[styles.statusIcon, { backgroundColor: meta.fill }]}>
                          <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
                        </View>
                        <Text style={[styles.statusTileLabel, { color: meta.color }]}>{meta.label}</Text>
                      </View>
                      <Text style={styles.statusTileCount}>{count}</Text>
                      <View style={styles.statusMeter}>
                        <View style={[styles.statusMeterFill, { width: `${percent}%`, backgroundColor: meta.color }]} />
                      </View>
                      <Text style={styles.statusTileHint}>{percent}% de los campos</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={styles.plotList}>
              {plots.map((plot) => (
                <PlotCard
                  key={plot.id}
                  plot={plot}
                  onPress={() => router.push({ pathname: '/plot/[id]', params: { id: plot.id, organizationId: selectedOrgId } })}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0f1512' },
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  header: { alignItems: 'flex-start', flexDirection: 'row', gap: 14, justifyContent: 'space-between', paddingTop: 8 },
  headerCopy: { flex: 1 },
  brandRow: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  brandMark: { alignItems: 'center', backgroundColor: '#171d1a', borderColor: '#252b28', borderRadius: 12, borderWidth: 1, height: 32, justifyContent: 'center', width: 32 },
  eyebrow: { color: '#22c55e', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: '#ffffff', fontSize: 28, fontWeight: '800', letterSpacing: -0.8, marginTop: 6 },
  selector: { backgroundColor: '#171d1a', borderColor: '#1f2923', borderRadius: 18, borderWidth: 1, padding: 14 },
  label: { color: '#86948a', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  selectorName: { color: '#ffffff', fontSize: 16, fontWeight: '800', marginTop: 4 },
  orgOptions: { gap: 8, paddingTop: 10 },
  orgOption: { backgroundColor: '#0f1512', borderColor: '#252b28', borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  orgOptionSelected: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  orgOptionText: { color: '#86948a', fontSize: 13, fontWeight: '600' },
  orgOptionTextSelected: { color: '#003824', fontWeight: '800' },
  loader: { marginTop: 48 },
  error: { color: '#ef4444', fontSize: 14, lineHeight: 20 },
  empty: { backgroundColor: '#171d1a', borderColor: '#1f2923', borderRadius: 18, borderWidth: 1, padding: 20 },
  cardTitle: { color: '#ffffff', fontSize: 18, fontWeight: '800' },
  cardText: { color: '#86948a', fontSize: 14, lineHeight: 20, marginTop: 6 },
  mapCard: { backgroundColor: '#171d1a', borderColor: '#1f2923', borderRadius: 20, borderWidth: 1, height: 350, overflow: 'hidden', position: 'relative' },
  mapContainer: { ...StyleSheet.absoluteFill },
  map: { ...StyleSheet.absoluteFill },
  webMap: { alignItems: 'center', backgroundColor: '#171d1a', flex: 1, justifyContent: 'center', padding: 28 },
  mapFallbackTitle: { color: '#ffffff', fontSize: 20, fontWeight: '800' },
  mapFallbackText: { color: '#86948a', fontSize: 14, lineHeight: 20, marginTop: 8, textAlign: 'center' },
  calloutPill: {
    backgroundColor: 'rgba(23, 29, 26, 0.92)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowColor: '#000000',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  calloutDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  calloutTextCol: {
    flexDirection: 'column',
  },
  calloutName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  calloutStatus: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  mapControlsTopRight: {
    position: 'absolute',
    top: 12,
    right: 12,
    gap: 8,
  },
  mapControlButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(23, 29, 26, 0.90)',
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 10,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  locationButton: {
    alignItems: 'center',
    backgroundColor: '#34d399',
    borderRadius: 12,
    bottom: 14,
    right: 14,
    elevation: 5,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    position: 'absolute',
    shadowColor: '#34d399',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  locationButtonText: { color: '#003824', fontSize: 13, fontWeight: '800' },
  locationMessage: { color: '#22c55e', fontSize: 12, lineHeight: 16 },
  statusPanel: { backgroundColor: '#171d1a', borderColor: '#1f2923', borderRadius: 20, borderWidth: 1, overflow: 'hidden', padding: 16 },
  statusPanelTop: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  legendHeader: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  statusPanelTitle: { color: '#ffffff', fontSize: 18, fontWeight: '800', letterSpacing: -0.3, marginTop: 6 },
  statusTotal: { color: '#22c55e', fontSize: 36, fontWeight: '900', letterSpacing: -1, lineHeight: 40 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  statusTile: { backgroundColor: '#0f1512', borderColor: '#252b28', borderRadius: 14, borderWidth: 1, padding: 12, width: '48%' },
  statusTileTop: { alignItems: 'center', flexDirection: 'row', gap: 7, minHeight: 28 },
  statusIcon: { alignItems: 'center', borderRadius: 999, height: 26, justifyContent: 'center', width: 26 },
  statusDot: { borderRadius: 6, height: 8, width: 8 },
  statusTileLabel: { flex: 1, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  statusTileCount: { color: '#ffffff', fontSize: 24, fontWeight: '800', letterSpacing: -0.5, marginTop: 8 },
  statusMeter: { backgroundColor: '#252b28', borderRadius: 999, height: 5, marginTop: 6, overflow: 'hidden' },
  statusMeterFill: { borderRadius: 999, height: '100%' },
  statusTileHint: { color: '#86948a', fontSize: 10.5, fontWeight: '600', marginTop: 6 },
  plotList: { gap: 12 },
});
