import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlotCard, type Plot } from '@/components/plot-card';
import { computePlotStatus, type PlotStatus } from '@/lib/plot-geometry';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/providers/organization-provider';
import { useSession } from '@/providers/session-provider';

export default function PlotsScreen() {
  const router = useRouter();
  const { session } = useSession();
  const {
    selectedOrgId,
    selectedOrganization,
    isLoading: isOrgLoading,
    error: orgError,
    refreshOrganizations,
  } = useOrganization();
  const [plots, setPlots] = useState<Plot[]>([]);
  const [canCreate, setCanCreate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PlotStatus>('all');

  const loadPlots = useCallback(async (organizationId?: string | null) => {
    if (!organizationId) {
      setPlots([]);
      setIsLoading(false);
      return;
    }
    setError(null);
    const result = await supabase
      .from('plots')
      .select('id, name, crop, threshold_min, threshold_max, stations(name, readings(measured_at, soil_moisture_pct, air_temperature_c))')
      .eq('organization_id', organizationId);

    if (result.error) {
      setError('No se pudieron cargar los lotes.');
    } else {
      setPlots(
        (result.data ?? []).map((p) => ({
          ...(p as unknown as Plot),
          stations: ((p as any).stations ?? []).map((s: any) => ({
            ...s,
            readings: [...(s.readings ?? [])].sort(
              (a: any, b: any) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime(),
            ),
          })),
        })),
      );
    }
    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    if (!session?.user?.id || !selectedOrgId) {
      setCanCreate(false);
      setPlots([]);
      if (!isOrgLoading) setIsLoading(false);
      return;
    }

    let active = true;
    setIsLoading(true);

    void Promise.all([
      supabase
        .from('memberships')
        .select('role')
        .eq('organization_id', selectedOrgId)
        .eq('user_id', session.user.id)
        .maybeSingle(),
      loadPlots(selectedOrgId),
    ]).then(([memberResult]) => {
      if (!active) return;
      const role = memberResult.data?.role;
      setCanCreate(role === 'producer' || role === 'operator');
    });

    return () => {
      active = false;
    };
  }, [session?.user?.id, selectedOrgId, isOrgLoading, loadPlots]);

  // Realtime subscription for readings and plots to keep plot list live
  useEffect(() => {
    if (!selectedOrgId) return;
    let active = true;
    const channel = supabase
      .channel(`plots-sync-${selectedOrgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'readings' }, () => {
        if (active) void loadPlots(selectedOrgId);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plots', filter: `organization_id=eq.${selectedOrgId}` }, () => {
        if (active) void loadPlots(selectedOrgId);
      })
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [selectedOrgId, loadPlots]);

  useFocusEffect(
    useCallback(() => {
      if (selectedOrgId) {
        void loadPlots(selectedOrgId);
      }
    }, [selectedOrgId, loadPlots])
  );

  const plotStatusMap = useMemo(() => {
    const map = new Map<string, PlotStatus>();
    for (const p of plots) {
      const latest = p.stations?.[0]?.readings?.[0] ?? null;
      const st = computePlotStatus(
        latest?.soil_moisture_pct ?? null,
        latest?.measured_at ?? null,
        Number(p.threshold_min),
        Number(p.threshold_max),
      );
      map.set(p.id, st);
    }
    return map;
  }, [plots]);

  const counts = useMemo(() => {
    let optimal = 0;
    let dry = 0;
    let wet = 0;
    let stale = 0;
    plotStatusMap.forEach((st) => {
      if (st === 'optimal') optimal++;
      else if (st === 'dry') dry++;
      else if (st === 'wet') wet++;
      else if (st === 'stale') stale++;
    });
    return { all: plots.length, optimal, dry, wet, stale };
  }, [plots, plotStatusMap]);

  const filtered = plots.filter((p) => {
    const matchesSearch =
      !search.trim() ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.crop ?? '').toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'all') return true;
    return plotStatusMap.get(p.id) === statusFilter;
  });

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
              void Promise.all([loadPlots(selectedOrgId), refreshOrganizations()]);
            }}
            tintColor="#22c55e"
          />
        }
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="leaf" color="#22c55e" size={18} />
            <Text style={styles.eyebrow}>AGROPULSE / LOTES</Text>
          </View>
          {canCreate && selectedOrgId && (
            <Pressable
              onPress={() => router.push({ pathname: '/create-plot' as any, params: { organizationId: selectedOrgId } })}
              style={styles.createButton}
            >
              <Ionicons name="add" color="#003824" size={18} />
              <Text style={styles.createButtonText}>Nuevo lote</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.titleRow}>
          <View style={styles.titleSection}>
            <Text style={styles.title}>Lotes de Producción</Text>
            <Text style={styles.subtitle}>Monitoreo en tiempo real de telemetría y suelo</Text>
          </View>
          <Pressable
            onPress={() => {
              setIsRefreshing(true);
              void loadPlots(selectedOrgId);
            }}
            style={styles.refreshButton}
            accessibilityLabel="Refrescar lotes"
          >
            <Ionicons name="refresh" color="#22c55e" size={20} />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <Pressable
            onPress={() => setStatusFilter('all')}
            style={[styles.filterChip, statusFilter === 'all' ? styles.filterChipActive : styles.filterChipInactive]}
          >
            <Text style={[styles.filterChipText, statusFilter === 'all' ? styles.filterChipTextActive : styles.filterChipTextInactive]}>
              Todos ({counts.all})
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setStatusFilter('optimal')}
            style={[styles.filterChip, statusFilter === 'optimal' ? styles.filterChipActive : styles.filterChipInactive]}
          >
            <Text style={[styles.filterChipText, statusFilter === 'optimal' ? styles.filterChipTextActive : styles.filterChipTextInactive]}>
              Óptimos ({counts.optimal})
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setStatusFilter('dry')}
            style={[styles.filterChip, statusFilter === 'dry' ? styles.filterChipActive : styles.filterChipInactive]}
          >
            <Text style={[styles.filterChipText, statusFilter === 'dry' ? styles.filterChipTextActive : styles.filterChipTextInactive]}>
              Secos ({counts.dry})
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setStatusFilter('stale')}
            style={[styles.filterChip, statusFilter === 'stale' ? styles.filterChipActive : styles.filterChipInactive]}
          >
            <Text style={[styles.filterChipText, statusFilter === 'stale' ? styles.filterChipTextActive : styles.filterChipTextInactive]}>
              Sin Datos ({counts.stale})
            </Text>
          </Pressable>
          {counts.wet > 0 && (
            <Pressable
              onPress={() => setStatusFilter('wet')}
              style={[styles.filterChip, statusFilter === 'wet' ? styles.filterChipActive : styles.filterChipInactive]}
            >
              <Text style={[styles.filterChipText, statusFilter === 'wet' ? styles.filterChipTextActive : styles.filterChipTextInactive]}>
                Húmedos ({counts.wet})
              </Text>
            </Pressable>
          )}
        </ScrollView>

        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color="#86948a" />
          <TextInput
            placeholder="Buscar por lote o cultivo..."
            placeholderTextColor="#5a6860"
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />
        </View>

        {displayLoading && <ActivityIndicator color="#22c55e" size="large" style={styles.loader} />}
        {displayError && <Text style={styles.error}>{displayError}</Text>}
        {!displayLoading && !displayError && !selectedOrgId && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Elegí un establecimiento</Text>
            <Text style={styles.emptyBody}>Seleccioná un establecimiento para ver sus lotes.</Text>
          </View>
        )}
        {!displayLoading && !displayError && selectedOrgId && filtered.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{search || statusFilter !== 'all' ? 'Sin coincidencias' : 'No hay lotes'}</Text>
            <Text style={styles.emptyBody}>
              {search || statusFilter !== 'all'
                ? 'Probá cambiando el filtro o término de búsqueda.'
                : `No hay lotes registrados en ${selectedOrganization?.name ?? 'este establecimiento'}.`}
            </Text>
          </View>
        )}
        {!displayLoading && !displayError && selectedOrgId && filtered.map((plot) => (
          <PlotCard
            key={plot.id}
            plot={plot}
            onPress={() =>
              router.push({
                pathname: '/plot/[id]',
                params: { id: plot.id, organizationId: selectedOrgId },
              })
            }
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0f1512' },
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8 },
  headerTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  eyebrow: { color: '#22c55e', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  createButton: {
    alignItems: 'center',
    backgroundColor: '#22c55e',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    shadowColor: '#22c55e',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  createButtonText: { color: '#003824', fontSize: 12, fontWeight: '800' },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  titleSection: { flex: 1, gap: 2 },
  title: { color: '#ffffff', fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: '#86948a', fontSize: 13 },
  refreshButton: {
    alignItems: 'center',
    backgroundColor: '#17221b',
    borderColor: '#243229',
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  filterChipActive: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  filterChipInactive: {
    backgroundColor: '#171f1a',
    borderColor: '#253029',
  },
  filterChipText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: '#003824',
  },
  filterChipTextInactive: {
    color: '#86948a',
  },
  searchContainer: {
    alignItems: 'center',
    backgroundColor: '#171d1a',
    borderColor: '#252b28',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: { color: '#dee4df', flex: 1, fontSize: 14 },
  loader: { marginTop: 32 },
  error: { color: '#ef4444', fontSize: 14 },
  empty: {
    backgroundColor: '#171d1a',
    borderColor: '#1f2923',
    borderWidth: 1,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: { color: '#ffffff', fontSize: 17, fontWeight: '800' },
  emptyBody: { color: '#86948a', fontSize: 13, marginTop: 6, textAlign: 'center' },
});
