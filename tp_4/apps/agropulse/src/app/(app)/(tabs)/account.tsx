import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { resolveOrganizationSelection, type Organization } from '@/lib/organization-selection';
import { describePipeline, workerLagSeconds } from '@/lib/diagnostics';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session-provider';

type MembershipRole = 'producer' | 'operator' | 'advisor';
type Heartbeat = { last_tick_at: string; last_consumed_at: string; status: string; updated_at: string };

const roleLabels: Record<MembershipRole, string> = {
  producer: 'Productor',
  operator: 'Operador',
  advisor: 'Asesor',
};

export default function AccountScreen() {
  const { session } = useSession();
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [role, setRole] = useState<MembershipRole | null>(null);
  const [heartbeat, setHeartbeat] = useState<Heartbeat | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 5_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!session) return;
    let mounted = true;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    const key = `agropulse.selected-organization.${session.user.id}`;
    void Promise.all([
      AsyncStorage.getItem(key),
      supabase.from('organizations').select('id, name').order('name'),
    ]).then(async ([storedId, result]) => {
      if (!mounted) return;
      if (result.error) { setError('No se pudieron cargar los datos de la cuenta.'); setIsLoading(false); return; }
      const available = (result.data ?? []) as Organization[];
      const resolved = resolveOrganizationSelection(available, storedId);
      setOrganizationName(available.find((o) => o.id === resolved)?.name ?? null);

      if (resolved) {
        const fetchHeartbeat = async () => {
          const { data } = await supabase.from('worker_heartbeats').select('last_tick_at, last_consumed_at, status, updated_at').eq('organization_id', resolved).eq('worker_name', 'agropulse-worker').maybeSingle();
          if (mounted) setHeartbeat(data as Heartbeat | null);
        };

        const [membershipResult] = await Promise.all([
          supabase.from('memberships').select('role').eq('organization_id', resolved).eq('user_id', session.user.id).maybeSingle(),
          fetchHeartbeat(),
        ]);
        if (mounted) {
          setRole((membershipResult.data as { role?: MembershipRole } | null)?.role ?? null);
          pollInterval = setInterval(() => { void fetchHeartbeat(); }, 10_000);
        }
      }
      if (mounted) setIsLoading(false);
    });
    return () => {
      mounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [session]);

  const lag = workerLagSeconds(heartbeat?.last_tick_at ?? null, now);
  const pipeline = describePipeline(heartbeat?.status ?? null, lag);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Ionicons name="person-outline" color="#d9e878" size={20} />
          <Text style={styles.eyebrow}>AGROPULSE / CUENTA</Text>
        </View>
        <Text style={styles.title}>Cuenta</Text>

        {isLoading ? (
          <ActivityIndicator color="#d9e878" size="large" style={styles.loader} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <>
            {/* User info card */}
            <View style={styles.card}>
              <View style={styles.avatarRow}>
                <View style={styles.avatar}>
                  <Ionicons name="person" color="#d9e878" size={28} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{session?.user.email}</Text>
                  <Text style={styles.cardSubtitle}>{role ? roleLabels[role] : 'Sin rol'}</Text>
                </View>
              </View>
              <InfoRow label="ID de usuario" value={session?.user.id ?? 'No disponible'} />
              <InfoRow label="Establecimiento" value={organizationName ?? 'Ninguno seleccionado'} />
              <InfoRow label="Rol" value={role ? roleLabels[role] : 'Sin membresía'} />
            </View>

            {/* Diagnostics card (RF-23) */}
            <View style={styles.diagnosticsCard}>
              <View style={styles.diagnosticsTopRow}>
                <View style={styles.diagnosticsIconShell}>
                  <Ionicons name="pulse" color="#d9e878" size={20} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.diagnosticsEyebrow}>ESTADO DEL SERVICIO</Text>
                  <Text style={styles.diagnosticsTitle}>Pipeline de eventos</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColors[pipeline.tone].bg }]}>
                  <View style={[styles.statusDot, { backgroundColor: statusColors[pipeline.tone].dot }]} />
                  <Text style={[styles.statusBadgeText, { color: statusColors[pipeline.tone].text }]}>
                    {pipeline.label}
                  </Text>
                </View>
              </View>

              <InfoRow label="Establecimiento" value={organizationName ?? 'Ninguno seleccionado'} />
              <InfoRow
                label="Última sincronización"
                value={heartbeat?.last_tick_at ? formatLocalTime(new Date(heartbeat.last_tick_at)) : 'Sin actividad'}
              />
              <InfoRow
                label="Latencia del worker"
                value={lag === null ? 'Sin datos' : `${Math.round(lag)}s`}
              />
              <InfoRow label="Servicio asignado" value="agropulse-worker" />

              <View style={styles.diagnosticsFooter}>
                <Ionicons name="information-circle-outline" color="#7d9385" size={15} />
                <Text style={styles.diagnosticsFooterText}>
                  Monitorea el procesamiento continuo de telemetría y ejecución de riego.
                </Text>
              </View>
            </View>

            {/* Sign out */}
            <Pressable onPress={() => void supabase.auth.signOut()} style={styles.signOutButton}>
              <Ionicons name="log-out-outline" color="#10251d" size={18} />
              <Text style={styles.signOutText}>Cerrar sesión</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');
function formatLocalTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const statusColors = {
  good: { bg: 'rgba(74, 222, 128, 0.15)', text: '#4ade80', dot: '#4ade80' },
  warning: { bg: 'rgba(250, 204, 21, 0.15)', text: '#facc15', dot: '#facc15' },
  neutral: { bg: 'rgba(148, 163, 184, 0.15)', text: '#94a3b8', dot: '#94a3b8' },
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#10251d' },
  content: { padding: 22, gap: 16, paddingBottom: 40 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 9, paddingTop: 12 },
  eyebrow: { color: '#a9bd78', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: '#f8f3e8', fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  loader: { marginTop: 48 },
  error: { color: '#ffb4aa', fontSize: 15, lineHeight: 22 },
  card: { backgroundColor: '#173827', borderColor: '#315340', borderRadius: 22, borderWidth: 1, padding: 18 },
  avatarRow: { alignItems: 'center', flexDirection: 'row', gap: 14, marginBottom: 16 },
  avatar: { alignItems: 'center', backgroundColor: '#10251d', borderRadius: 28, height: 56, justifyContent: 'center', width: 56 },
  cardTitle: { color: '#f4f0e6', fontSize: 17, fontWeight: '800' },
  cardSubtitle: { color: '#a9bd78', fontSize: 13, fontWeight: '700', marginTop: 3 },
  infoRow: { borderTopColor: 'rgba(255,255,255,0.08)', borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  infoLabel: { color: '#a8b7ae', fontSize: 13 },
  infoValue: { color: '#f4f0e6', flex: 1, fontSize: 13, fontWeight: '700', marginLeft: 12, textAlign: 'right' },
  diagnosticsCard: { backgroundColor: '#132d20', borderColor: '#264a37', borderRadius: 22, borderWidth: 1, padding: 18, gap: 4 },
  diagnosticsTopRow: { alignItems: 'center', flexDirection: 'row', gap: 12, marginBottom: 8 },
  diagnosticsIconShell: { alignItems: 'center', backgroundColor: '#1b3f2f', borderColor: 'rgba(217, 232, 120, 0.25)', borderRadius: 12, borderWidth: 1, height: 40, justifyContent: 'center', width: 40 },
  diagnosticsEyebrow: { color: '#a9bd78', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  diagnosticsTitle: { color: '#f4f0e6', fontSize: 16, fontWeight: '800', marginTop: 2 },
  statusBadge: { alignItems: 'center', borderRadius: 12, flexDirection: 'row', gap: 6, paddingHorizontal: 10, paddingVertical: 5 },
  statusDot: { borderRadius: 4, height: 7, width: 7 },
  statusBadgeText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  diagnosticsFooter: { alignItems: 'center', borderTopColor: 'rgba(255, 255, 255, 0.06)', borderTopWidth: 1, flexDirection: 'row', gap: 6, marginTop: 4, paddingTop: 12 },
  diagnosticsFooterText: { color: '#7d9385', flex: 1, fontSize: 11, lineHeight: 15 },
  signOutButton: { alignItems: 'center', backgroundColor: '#d9e878', borderRadius: 16, flexDirection: 'row', gap: 8, justifyContent: 'center', padding: 16, marginTop: 4 },
  signOutText: { color: '#10251d', fontSize: 16, fontWeight: '800' },
});
