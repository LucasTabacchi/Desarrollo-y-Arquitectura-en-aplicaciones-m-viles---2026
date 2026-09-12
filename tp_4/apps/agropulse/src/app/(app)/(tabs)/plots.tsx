import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlotCard, type Plot } from '@/components/plot-card';
import { resolveOrganizationSelection, type Organization } from '@/lib/organization-selection';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session-provider';

export default function PlotsScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [plots, setPlots] = useState<Plot[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [canCreate, setCanCreate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  async function loadPlots(organizationId?: string | null) {
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
  }

  useEffect(() => {
    if (!session) return;
    let mounted = true;
    const key = `agropulse.selected-organization.${session.user.id}`;
    void Promise.all([
      AsyncStorage.getItem(key),
      supabase.from('organizations').select('id, name').order('name'),
    ]).then(async ([storedId, result]) => {
      if (!mounted) return;
      if (result.error) {
        setError('No se pudieron cargar los establecimientos.');
        setIsLoading(false);
        return;
      }
      const available = (result.data ?? []) as Organization[];
      const resolved = resolveOrganizationSelection(available, storedId);
      setSelectedId(resolved);
      if (resolved) {
        const { data: member } = await supabase
          .from('memberships')
          .select('role')
          .eq('organization_id', resolved)
          .eq('user_id', session.user.id)
          .maybeSingle();
        setCanCreate(member?.role === 'producer' || member?.role === 'operator');
      }
      await loadPlots(resolved);
    });
    return () => {
      mounted = false;
    };
  }, [session]);

  const filtered = search.trim()
    ? plots.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          (p.crop ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : plots;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              void loadPlots(selectedId);
            }}
            tintColor="#d9e878"
          />
        }
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="leaf-outline" color="#d9e878" size={20} />
            <Text style={styles.eyebrow}>AGROPULSE / LOTES</Text>
          </View>
          {canCreate && selectedId && (
            <Pressable
              onPress={() => router.push({ pathname: '/create-plot' as any, params: { organizationId: selectedId } })}
              style={styles.createButton}
            >
              <Ionicons name="add-outline" color="#10251d" size={18} />
              <Text style={styles.createButtonText}>Nuevo lote</Text>
            </Pressable>
          )}
        </View>
        <Text style={styles.title}>Todos los lotes</Text>

        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" color="#708078" size={18} />
          <TextInput
            accessibilityLabel="Buscar lotes"
            placeholder="Buscar por nombre o cultivo…"
            placeholderTextColor="#708078"
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />
        </View>

        {isLoading && <ActivityIndicator color="#d9e878" size="large" style={styles.loader} />}
        {error && <Text style={styles.error}>{error}</Text>}
        {!isLoading && !error && filtered.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{search ? 'Sin coincidencias' : 'No hay lotes'}</Text>
            <Text style={styles.emptyBody}>
              {search ? 'Probá con otro término de búsqueda.' : 'No hay lotes registrados en este establecimiento.'}
            </Text>
          </View>
        )}
        {filtered.map((plot) => (
          <PlotCard
            key={plot.id}
            plot={plot}
            onPress={() =>
              router.push({
                pathname: '/plot/[id]',
                params: { id: plot.id, organizationId: selectedId! },
              })
            }
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#10251d' },
  content: { padding: 22, gap: 14, paddingBottom: 40 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12 },
  headerTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  eyebrow: { color: '#a9bd78', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  createButton: {
    alignItems: 'center',
    backgroundColor: '#d9e878',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  createButtonText: { color: '#10251d', fontSize: 12, fontWeight: '800' },
  title: { color: '#f8f3e8', fontSize: 34, fontWeight: '900', letterSpacing: -1, marginTop: 4 },
  searchContainer: { alignItems: 'center', backgroundColor: '#173827', borderColor: '#315340', borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput: { color: '#f8f3e8', flex: 1, fontSize: 15 },
  loader: { marginTop: 32 },
  error: { color: '#ffb4aa', fontSize: 14 },
  empty: { backgroundColor: '#173827', borderRadius: 20, padding: 24, textAlign: 'center' },
  emptyTitle: { color: '#f8f3e8', fontSize: 18, fontWeight: '800' },
  emptyBody: { color: '#b5c0b9', fontSize: 14, marginTop: 6 },
});
