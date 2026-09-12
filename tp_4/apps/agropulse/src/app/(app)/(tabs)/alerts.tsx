import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { resolveOrganizationSelection, type Organization } from '@/lib/organization-selection';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session-provider';

type Alert = {
  id: string;
  plot_id: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  resolved_at: string | null;
  created_at: string;
  plots?: { name: string } | null;
};

const severityMeta: Record<string, { icon: React.ComponentProps<typeof Ionicons>['name']; color: string; bg: string }> = {
  info: { icon: 'information-circle-outline', color: '#4c88c7', bg: 'rgba(76,136,199,0.12)' },
  warning: { icon: 'warning-outline', color: '#c78932', bg: 'rgba(199,137,50,0.12)' },
  critical: { icon: 'alert-circle-outline', color: '#d65c4a', bg: 'rgba(214,92,74,0.12)' },
};

export default function AlertsScreen() {
  const { session } = useSession();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function loadAlerts(organizationId?: string | null) {
    if (!organizationId) { setAlerts([]); setIsLoading(false); return; }
    setError(null);
    // Get plot IDs for this organization first
    const plotsResult = await supabase.from('plots').select('id').eq('organization_id', organizationId);
    if (plotsResult.error) { setError('No se pudieron cargar las alertas.'); setIsLoading(false); setIsRefreshing(false); return; }
    const plotIds = (plotsResult.data ?? []).map((p) => p.id);
    if (plotIds.length === 0) { setAlerts([]); setIsLoading(false); setIsRefreshing(false); return; }

    const result = await supabase.from('alerts').select('id, plot_id, message, severity, resolved_at, created_at, plots(name)').in('plot_id', plotIds).order('created_at', { ascending: false }).limit(50);
    if (result.error) setError('No se pudieron cargar las alertas.');
    else setAlerts((result.data ?? []) as unknown as Alert[]);
    setIsLoading(false); setIsRefreshing(false);
  }

  useEffect(() => {
    if (!session) return;
    let mounted = true;
    const key = `agropulse.selected-organization.${session.user.id}`;
    void Promise.all([AsyncStorage.getItem(key), supabase.from('organizations').select('id, name').order('name')]).then(async ([storedId, result]) => {
      if (!mounted) return;
      if (result.error) { setError('No se pudieron cargar los establecimientos.'); setIsLoading(false); return; }
      const available = (result.data ?? []) as Organization[];
      const resolved = resolveOrganizationSelection(available, storedId);
      setSelectedId(resolved);
      await loadAlerts(resolved);
    });
    return () => { mounted = false; };
  }, [session]);

  // Subscribe to Realtime for live alert updates
  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    const channel = supabase
      .channel(`alerts-${selectedId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => {
        if (active) void loadAlerts(selectedId);
      })
      .subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [selectedId]);

  const unresolved = alerts.filter((a) => !a.resolved_at);
  const resolved = alerts.filter((a) => a.resolved_at);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); void loadAlerts(selectedId); }} tintColor="#d9e878" />}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Ionicons name="notifications-outline" color="#d9e878" size={20} />
          <Text style={styles.eyebrow}>AGROPULSE / ALERTAS</Text>
        </View>
        <Text style={styles.title}>Alertas</Text>

        {isLoading && <ActivityIndicator color="#d9e878" size="large" style={styles.loader} />}
        {error && <Text style={styles.error}>{error}</Text>}

        {!isLoading && !error && alerts.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="checkmark-circle-outline" color="#549c60" size={40} />
            <Text style={styles.emptyTitle}>Todo en orden</Text>
            <Text style={styles.emptyBody}>No hay alertas activas en este establecimiento.</Text>
          </View>
        )}

        {unresolved.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>ACTIVAS</Text>
            {unresolved.map((alert) => <AlertCard key={alert.id} alert={alert} />)}
          </>
        )}

        {resolved.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>RESUELTAS</Text>
            {resolved.map((alert) => <AlertCard key={alert.id} alert={alert} />)}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const severityLabels: Record<string, string> = {
  info: 'INFORMATIVA',
  warning: 'ADVERTENCIA',
  critical: 'CRÍTICA',
};

function AlertCard({ alert }: { alert: Alert }) {
  const meta = severityMeta[alert.severity] ?? severityMeta.info;
  const plotName = (alert.plots as { name: string } | null)?.name ?? 'Lote no asignado';
  const isResolved = Boolean(alert.resolved_at);
  const timestamp = new Date(alert.created_at);

  return (
    <View style={[styles.card, { backgroundColor: isResolved ? '#1a2e24' : meta.bg }]}>
      <View style={styles.cardHeader}>
        <Ionicons name={meta.icon} color={isResolved ? '#708078' : meta.color} size={22} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardSeverity, { color: isResolved ? '#708078' : meta.color }]}>
            {severityLabels[alert.severity] ?? alert.severity.toUpperCase()}
          </Text>
          <Text style={styles.cardPlot}>{plotName}</Text>
        </View>
        {isResolved && (
          <View style={styles.resolvedBadge}>
            <Text style={styles.resolvedText}>Resuelta</Text>
          </View>
        )}
      </View>
      <Text style={[styles.cardMessage, isResolved && styles.cardMessageResolved]}>{alert.message}</Text>
      <Text style={styles.cardTime}>
        {Number.isFinite(timestamp.getTime()) ? timestamp.toLocaleString() : 'Time unavailable'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#10251d' },
  content: { padding: 22, gap: 14, paddingBottom: 40 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 9, paddingTop: 12 },
  eyebrow: { color: '#a9bd78', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: '#f8f3e8', fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  sectionLabel: { color: '#708078', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginTop: 8 },
  loader: { marginTop: 48 },
  error: { color: '#ffb4aa', fontSize: 15, lineHeight: 22 },
  empty: { alignItems: 'center', backgroundColor: '#173827', borderColor: '#365345', borderRadius: 22, borderWidth: 1, gap: 8, padding: 32 },
  emptyTitle: { color: '#f4f0e6', fontSize: 20, fontWeight: '800' },
  emptyBody: { color: '#b5c0b9', fontSize: 14, textAlign: 'center' },
  card: { borderColor: 'rgba(255,255,255,0.08)', borderRadius: 18, borderWidth: 1, padding: 16 },
  cardHeader: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  cardSeverity: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  cardPlot: { color: '#f4f0e6', fontSize: 15, fontWeight: '800', marginTop: 2 },
  cardMessage: { color: '#d4ddd8', fontSize: 14, lineHeight: 20, marginTop: 10 },
  cardMessageResolved: { color: '#708078' },
  cardTime: { color: '#708078', fontSize: 12, marginTop: 8 },
  resolvedBadge: { backgroundColor: 'rgba(84,156,96,0.2)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  resolvedText: { color: '#549c60', fontSize: 11, fontWeight: '800' },
});
