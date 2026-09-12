import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { resolveOrganizationSelection, type Organization } from '@/lib/organization-selection';
import { computePlotStatus, DEFAULT_STALE_AGE_MS, formatReadingAge, isPointInPolygon, polygonToMapCoordinates, type MapCoordinate, type PlotStatus } from '@/lib/plot-geometry';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session-provider';
import { registerAutoFlush } from '@/lib/offline-queue';
import { PlotCard } from '@/components/plot-card';

const LOAD_TIMEOUT_MS = 15_000;
const selectedOrganizationKey = (userId: string) => `agropulse.selected-organization.${userId}`;
const statusMeta: Record<PlotStatus, { label: string; color: string; fill: string }> = {
  stale: { label: 'Sin datos', color: '#87918b', fill: 'rgba(135,145,139,0.28)' },
  dry: { label: 'Seco', color: '#d65c4a', fill: 'rgba(214,92,74,0.28)' },
  optimal: { label: 'Óptimo', color: '#549c60', fill: 'rgba(84,156,96,0.28)' },
  wet: { label: 'Húmedo', color: '#4c88c7', fill: 'rgba(76,136,199,0.28)' },
};

type Reading = { measured_at: string; soil_moisture_pct: number; air_temperature_c: number | null };
type Plot = { id: string; name: string; crop: string | null; boundary: unknown; threshold_min: number; threshold_max: number; stations: { id: string; name: string; external_id: string | null; readings: Reading[] }[] };

function NativeMap({ plots, position, onSelect }: { plots: Plot[]; position: MapCoordinate | null; onSelect: (plot: Plot) => void }) {
  const mapRef = useRef<React.ElementRef<typeof import('react-native-maps').default>>(null);
  if (Platform.OS === 'web') return <View style={styles.webMap}><Text style={styles.mapFallbackTitle}>Vista previa del mapa</Text><Text style={styles.mapFallbackText}>Abrí AgroPulse en iOS o Android para explorar los límites de los lotes.</Text></View>;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const maps = require('react-native-maps') as typeof import('react-native-maps');
  const MapView = maps.default;
  const { Marker, Polygon } = maps;
  const polygons = plots.map((plot) => ({ plot, coordinates: polygonToMapCoordinates(plot.boundary) })).filter(({ coordinates }) => coordinates.length >= 3);
  const allCoordinates = polygons.flatMap(({ coordinates }) => coordinates);
  const fallback = allCoordinates[0] ?? { latitude: -31.391, longitude: -58.397 };
  function fitMap() { if (allCoordinates.length) mapRef.current?.fitToCoordinates(allCoordinates, { edgePadding: { top: 48, right: 48, bottom: 48, left: 48 }, animated: false }); }
  return <MapView ref={mapRef} provider={maps.PROVIDER_GOOGLE} mapType="hybrid" style={styles.map} initialRegion={{ ...fallback, latitudeDelta: 0.005, longitudeDelta: 0.005 }} onMapReady={fitMap} onLayout={fitMap} showsUserLocation={Boolean(position)}>
    {polygons.map(({ plot, coordinates }) => { const status = computeStatus(plot); return <Fragment key={plot.id}><Polygon coordinates={coordinates} fillColor={statusMeta[status].fill} strokeColor={statusMeta[status].color} strokeWidth={2} tappable onPress={() => onSelect(plot)} /><Marker coordinate={coordinates[0]} title={plot.name} description={statusMeta[status].label} onPress={() => onSelect(plot)} /></Fragment>; })}
    {position && <Marker coordinate={position} title="Tu posición" pinColor="#10251d" />}
  </MapView>;
}

function computeStatus(plot: Plot): PlotStatus { const reading = plot.stations[0]?.readings[0]; return computePlotStatus(reading?.soil_moisture_pct ?? null, reading?.measured_at ?? null, Number(plot.threshold_min), Number(plot.threshold_max), Date.now(), DEFAULT_STALE_AGE_MS); }
function latestReading(plot: Plot) { return plot.stations[0]?.readings[0] ?? null; }

export default function MapScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [isLoading, setIsLoading] = useState(true); const [isRefreshing, setIsRefreshing] = useState(false); const [error, setError] = useState<string | null>(null); const [locationMessage, setLocationMessage] = useState<string | null>(null); const [position, setPosition] = useState<MapCoordinate | null>(null);

  useEffect(() => { registerAutoFlush(); }, []);

  async function loadData(organizationId?: string | null) {
    if (!organizationId) { setPlots([]); setIsLoading(false); return; }
    setError(null);
    const timeout = setTimeout(() => { setIsLoading(false); setIsRefreshing(false); setError('Tiempo de espera agotado. Deslizá hacia abajo para reintentar.'); }, LOAD_TIMEOUT_MS);
    try {
      const result = await supabase.from('plots').select('id, name, crop, boundary, threshold_min, threshold_max, stations(id, name, external_id, readings(measured_at, soil_moisture_pct, air_temperature_c))').eq('organization_id', organizationId);
      clearTimeout(timeout);
      if (result.error) setError('No se pudieron cargar los lotes. Comprobá tu conexión e intentá de nuevo.'); else setPlots((result.data ?? []).map((plot) => ({ ...(plot as unknown as Plot), stations: (plot as unknown as Plot).stations.map((station) => ({ ...station, readings: [...station.readings].sort((a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime()) })) })));
    } catch {
      clearTimeout(timeout);
      setError('No se pudieron cargar los lotes. Comprobá tu conexión e intentá de nuevo.');
    }
    setIsLoading(false); setIsRefreshing(false);
  }

  useEffect(() => { if (!session) return; let mounted = true; void Promise.all([AsyncStorage.getItem(selectedOrganizationKey(session.user.id)), supabase.from('organizations').select('id, name').order('name')]).then(async ([storedId, result]) => { if (!mounted) return; if (result.error) { setError('No se pudieron cargar los establecimientos. Comprobá tu conexión e intentá de nuevo.'); setIsLoading(false); return; } const available = (result.data ?? []) as Organization[]; const resolved = resolveOrganizationSelection(available, storedId); setOrganizations(available); setSelectedId(resolved); if (resolved && resolved !== storedId) await AsyncStorage.setItem(selectedOrganizationKey(session.user.id), resolved); await loadData(resolved); }); return () => { mounted = false; }; }, [session]);
  async function selectOrganization(id: string) { if (!session || !organizations.some((organization) => organization.id === id)) return; setSelectedId(id); await AsyncStorage.setItem(selectedOrganizationKey(session.user.id), id); setIsLoading(true); await loadData(id); }
  async function centerOnPosition() { setLocationMessage(null); try { const permission = await Location.requestForegroundPermissionsAsync(); if (permission.status !== Location.PermissionStatus.GRANTED) { setLocationMessage('No se otorgó acceso a la ubicación. El mapa sigue disponible sin ella.'); return; } if (!(await Location.hasServicesEnabledAsync())) { setLocationMessage('Los servicios de ubicación no están disponibles. Podés seguir usando el mapa.'); return; } const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }); const next = { latitude: current.coords.latitude, longitude: current.coords.longitude }; setPosition(next); setLocationMessage(plots.some((plot) => isPointInPolygon(next, polygonToMapCoordinates(plot.boundary))) ? 'Estás dentro de uno de tus lotes.' : 'Estás fuera de los lotes disponibles.'); } catch { setLocationMessage('No pudimos determinar tu posición. El mapa sigue disponible.'); } }
  const summary = useMemo(() => plots.reduce((counts, plot) => { counts[computeStatus(plot)] += 1; return counts; }, { stale: 0, dry: 0, optimal: 0, wet: 0 } as Record<PlotStatus, number>), [plots]);
  const totalPlots = plots.length;
  const organizationName = organizations.find(({ id }) => id === selectedId)?.name;
  return <SafeAreaView style={styles.screen}><ScrollView refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); void loadData(selectedId); }} tintColor="#d9e878" />} contentContainerStyle={styles.content}>
    <View style={styles.header}><View style={styles.headerCopy}><View style={styles.brandRow}><View style={styles.brandMark}><Ionicons name="map-outline" color="#d9e878" size={19} /></View><Text style={styles.eyebrow}>AGROPULSE / VISTA DE CAMPO</Text></View><Text style={styles.title}>Tus lotes.</Text></View></View>
    {organizations.length > 1 && <View style={styles.selector}><Text style={styles.label}>ESTABLECIMIENTO</Text><Text style={styles.selectorName}>{organizationName ?? 'Seleccionar establecimiento'}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.orgOptions}>{organizations.map((org) => <Pressable key={org.id} onPress={() => void selectOrganization(org.id)} style={[styles.orgOption, org.id === selectedId && styles.orgOptionSelected]}><Text style={[styles.orgOptionText, org.id === selectedId && styles.orgOptionTextSelected]}>{org.name}</Text></Pressable>)}</ScrollView></View>}
    {isLoading && <ActivityIndicator color="#d9e878" size="large" style={styles.loader} />}{error && <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}{!isLoading && !error && !selectedId && <View style={styles.empty}><Text style={styles.cardTitle}>Elegí un establecimiento</Text><Text style={styles.cardText}>Seleccioná un establecimiento para ver sus lotes.</Text></View>}{!isLoading && !error && selectedId && plots.length === 0 && <View style={styles.empty}><Text style={styles.cardTitle}>Sin lotes aún</Text><Text style={styles.cardText}>No hay lotes en {organizationName ?? 'este establecimiento'}.</Text></View>}
      {!isLoading && !error && selectedId && plots.length > 0 && <><View style={styles.mapCard}><NativeMap plots={plots} position={position} onSelect={(plot) => router.push({ pathname: '/plot/[id]', params: { id: plot.id, organizationId: selectedId } })} /><Pressable style={styles.locationButton} onPress={() => void centerOnPosition()}><Ionicons name="locate-outline" color="#10251d" size={16} /><Text style={styles.locationButtonText}>Centrar en mi ubicación</Text></Pressable></View>{locationMessage && <Text style={styles.locationMessage}>{locationMessage}</Text>}<View style={styles.statusPanel}><View style={styles.statusPanelTop}><View><View style={styles.legendHeader}><Ionicons name="pulse-outline" color="#d9e878" size={18} /><Text style={styles.label}>ESTADO DEL CAMPO</Text></View><Text style={styles.statusPanelTitle}>Estado de lotes en vivo</Text></View><Text style={styles.statusTotal}>{totalPlots}</Text></View><View style={styles.statusGrid}>{Object.entries(statusMeta).map(([status, meta]) => { const count = summary[status as PlotStatus]; const percent = totalPlots ? Math.round((count / totalPlots) * 100) : 0; return <View key={status} style={styles.statusTile}><View style={styles.statusTileTop}><View style={[styles.statusIcon, { backgroundColor: meta.fill }]}><View style={[styles.statusDot, { backgroundColor: meta.color }]} /></View><Text style={[styles.statusTileLabel, { color: meta.color }]}>{meta.label}</Text></View><Text style={styles.statusTileCount}>{count}</Text><View style={styles.statusMeter}><View style={[styles.statusMeterFill, { width: `${percent}%`, backgroundColor: meta.color }]} /></View><Text style={styles.statusTileHint}>{percent}% de los campos</Text></View>; })}</View></View><View style={styles.plotList}>{plots.map((plot) => <PlotCard key={plot.id} plot={plot} onPress={() => router.push({ pathname: '/plot/[id]', params: { id: plot.id, organizationId: selectedId } })} />)}</View></>}
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: '#10251d' }, content: { padding: 22, gap: 16, paddingBottom: 40 }, header: { alignItems: 'flex-start', flexDirection: 'row', gap: 14, justifyContent: 'space-between', paddingTop: 12 }, headerCopy: { flex: 1 }, brandRow: { alignItems: 'center', flexDirection: 'row', gap: 9 }, brandMark: { alignItems: 'center', backgroundColor: '#173827', borderColor: '#315340', borderRadius: 13, borderWidth: 1, height: 34, justifyContent: 'center', width: 34 }, eyebrow: { color: '#a9bd78', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 }, title: { color: '#f8f3e8', fontSize: 38, fontWeight: '900', letterSpacing: -1.2, marginTop: 10 }, selector: { backgroundColor: '#1c382c', borderColor: '#2d5040', borderRadius: 22, borderWidth: 1, padding: 16 }, label: { color: '#a9bd78', fontSize: 10, fontWeight: '800', letterSpacing: 1.3 }, selectorName: { color: '#f4f0e6', fontSize: 18, fontWeight: '800', marginTop: 6 }, orgOptions: { gap: 8, paddingTop: 12 }, orgOption: { borderColor: '#365345', borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 }, orgOptionSelected: { backgroundColor: '#d9e878', borderColor: '#d9e878' }, orgOptionText: { color: '#a8b7ae', fontSize: 13, fontWeight: '700' }, orgOptionTextSelected: { color: '#10251d' }, loader: { marginTop: 48 }, error: { color: '#ffb4aa', fontSize: 15, lineHeight: 22 }, empty: { backgroundColor: '#173827', borderColor: '#365345', borderRadius: 22, borderWidth: 1, padding: 20 }, cardTitle: { color: '#f4f0e6', fontSize: 21, fontWeight: '800' }, cardText: { color: '#b5c0b9', fontSize: 15, lineHeight: 21, marginTop: 8 }, mapCard: { backgroundColor: '#1c382c', borderColor: '#315340', borderRadius: 28, borderWidth: 1, height: 320, overflow: 'hidden', position: 'relative' }, map: { ...StyleSheet.absoluteFill }, webMap: { alignItems: 'center', backgroundColor: '#d8e1d4', flex: 1, justifyContent: 'center', padding: 28 }, mapFallbackTitle: { color: '#10251d', fontSize: 22, fontWeight: '800' }, mapFallbackText: { color: '#52645b', fontSize: 14, lineHeight: 20, marginTop: 8, textAlign: 'center' }, locationButton: { alignItems: 'center', backgroundColor: '#f8f3e8', borderRadius: 16, bottom: 14, elevation: 4, flexDirection: 'row', gap: 7, left: 14, paddingHorizontal: 14, paddingVertical: 11, position: 'absolute', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } }, locationButtonText: { color: '#10251d', fontSize: 13, fontWeight: '800' }, locationMessage: { color: '#d9e878', fontSize: 13, lineHeight: 18 }, statusPanel: { backgroundColor: '#173827', borderColor: '#315340', borderRadius: 28, borderWidth: 1, overflow: 'hidden', padding: 18 }, statusPanelTop: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' }, legendHeader: { alignItems: 'center', flexDirection: 'row', gap: 8 }, statusPanelTitle: { color: '#f8f3e8', fontSize: 22, fontWeight: '900', letterSpacing: -0.4, marginTop: 8 }, statusTotal: { color: '#d9e878', fontSize: 44, fontWeight: '900', letterSpacing: -1.2, lineHeight: 48 }, statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 }, statusTile: { backgroundColor: 'rgba(255,255,255,0.065)', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 18, borderWidth: 1, padding: 13, width: '48%' }, statusTileTop: { alignItems: 'center', flexDirection: 'row', gap: 8, minHeight: 30 }, statusIcon: { alignItems: 'center', borderRadius: 999, height: 28, justifyContent: 'center', width: 28 }, statusDot: { borderRadius: 6, height: 10, width: 10 }, statusTileLabel: { flex: 1, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' }, statusTileCount: { color: '#f8f3e8', fontSize: 28, fontWeight: '900', letterSpacing: -0.8, marginTop: 10 }, statusMeter: { backgroundColor: 'rgba(255,255,255,0.11)', borderRadius: 999, height: 6, marginTop: 7, overflow: 'hidden' }, statusMeterFill: { borderRadius: 999, height: '100%' }, statusTileHint: { color: '#9aaba1', fontSize: 11, fontWeight: '700', marginTop: 7 }, plotList: { gap: 12 }, plotCard: { alignItems: 'center', backgroundColor: '#1c382c', borderColor: '#2d5040', borderRadius: 22, borderWidth: 1, elevation: 3, flexDirection: 'row', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 14, shadowOffset: { width: 0, height: 10 } }, cardPressed: { transform: [{ scale: 0.99 }], opacity: 0.92 }, statusRail: { alignSelf: 'stretch', width: 7 }, plotMain: { flex: 1, padding: 16 }, plotHeading: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, justifyContent: 'space-between' }, plotName: { color: '#f4f0e6', fontSize: 18, fontWeight: '900' }, statusText: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase' }, crop: { color: '#a8b7ae', fontSize: 13, marginTop: 4 }, reading: { color: '#8a9b91', fontSize: 13, marginTop: 11 }, chevronIcon: { marginRight: 14 } });
