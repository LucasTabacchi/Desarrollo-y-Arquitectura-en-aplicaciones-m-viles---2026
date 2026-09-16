import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EstablishmentHeader } from '@/components/establishment-header';
import { describePipeline, workerLagSeconds } from '@/lib/diagnostics';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/providers/organization-provider';
import { useSession } from '@/providers/session-provider';

type MembershipRole = 'producer' | 'operator' | 'advisor';
type Heartbeat = { last_tick_at: string; last_consumed_at: string; status: string; updated_at: string };

const roleLabels: Record<MembershipRole, string> = {
  producer: 'Productor',
  operator: 'Operador',
  advisor: 'Asesor',
};

const statusColors = {
  good: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', dot: '#22c55e' },
  warning: { bg: 'rgba(234, 179, 8, 0.15)', text: '#eab308', dot: '#eab308' },
  neutral: { bg: 'rgba(107, 114, 128, 0.15)', text: '#9ca3af', dot: '#9ca3af' },
};

const pad = (n: number) => String(n).padStart(2, '0');
function formatLocalTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export default function AccountScreen() {
  const { session } = useSession();
  const { selectedOrgId, selectedOrganization, isLoading: isOrgLoading, error: orgError } = useOrganization();
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
    if (!session?.user?.id || !selectedOrgId) {
      setRole(null);
      setHeartbeat(null);
      if (!isOrgLoading) setIsLoading(false);
      return;
    }

    let mounted = true;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    setIsLoading(true);
    setError(null);

    const fetchHeartbeat = async () => {
      const { data } = await supabase
        .from('worker_heartbeats')
        .select('last_tick_at, last_consumed_at, status, updated_at')
        .eq('organization_id', selectedOrgId)
        .eq('worker_name', 'agropulse-worker')
        .maybeSingle();
      if (mounted) setHeartbeat(data as Heartbeat | null);
    };

    void Promise.all([
      supabase
        .from('memberships')
        .select('role')
        .eq('organization_id', selectedOrgId)
        .eq('user_id', session.user.id)
        .maybeSingle(),
      fetchHeartbeat(),
    ])
      .then(([membershipResult]) => {
        if (!mounted) return;
        setRole((membershipResult.data as { role?: MembershipRole } | null)?.role ?? null);
        setIsLoading(false);
        pollInterval = setInterval(() => {
          void fetchHeartbeat();
        }, 10_000);
      })
      .catch(() => {
        if (mounted) {
          setError('No se pudieron cargar los datos de la cuenta.');
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [session?.user?.id, selectedOrgId, isOrgLoading]);

  const organizationName = selectedOrganization?.name ?? null;
  const lag = workerLagSeconds(heartbeat?.last_tick_at ?? null, now);
  const pipeline = describePipeline(heartbeat?.status ?? null, lag);
  const displayLoading = isLoading || isOrgLoading;
  const displayError = error || orgError;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <EstablishmentHeader showAvatar={false} />

        {displayLoading ? (
          <ActivityIndicator color="#22c55e" size="large" style={styles.loader} />
        ) : displayError ? (
          <Text style={styles.error}>{displayError}</Text>
        ) : (
          <>
            {/* Hero Profile Card */}
            <View style={styles.heroCard}>
              <View style={styles.heroAvatarContainer}>
                <View style={styles.heroAvatar}>
                  <Ionicons name="person" color="#003824" size={38} />
                  <View style={styles.avatarStatusBadge}>
                    <View style={styles.avatarStatusDot} />
                  </View>
                </View>
              </View>

              <Text style={styles.heroEmail} numberOfLines={1}>
                {session?.user.email}
              </Text>

              <View style={styles.heroRoleBadge}>
                <Ionicons name="shield-checkmark" size={13} color="#22c55e" />
                <Text style={styles.heroRoleText}>
                  {role ? roleLabels[role].toUpperCase() : 'SIN ROL'}
                </Text>
              </View>

              {organizationName && (
                <View style={styles.heroEstRow}>
                  <Ionicons name="leaf-outline" size={14} color="#22c55e" />
                  <Text style={styles.heroEstText} numberOfLines={1}>
                    {organizationName}
                  </Text>
                </View>
              )}
            </View>

            {/* Section 1: DETALLES DE LA CUENTA */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>DETALLES DE LA CUENTA</Text>
              <View style={styles.cardContainer}>
                {/* Correo Electrónico */}
                <View style={styles.cardRow}>
                  <View style={styles.cardIconBox}>
                    <Ionicons name="mail-outline" size={18} color="#22c55e" />
                  </View>
                  <View style={styles.cardRowContent}>
                    <Text style={styles.cardRowLabel}>Correo Electrónico</Text>
                    <Text style={styles.cardRowValue} numberOfLines={1}>
                      {session?.user.email}
                    </Text>
                  </View>
                </View>

                <View style={styles.rowDivider} />

                {/* Rol Asignado */}
                <View style={styles.cardRow}>
                  <View style={styles.cardIconBox}>
                    <Ionicons name="id-card-outline" size={18} color="#22c55e" />
                  </View>
                  <View style={styles.cardRowContent}>
                    <Text style={styles.cardRowLabel}>Rol Asignado</Text>
                    <Text style={styles.cardRowValue}>
                      {role ? `${roleLabels[role]} Agrícola` : 'Sin membresía'}
                    </Text>
                  </View>
                </View>

                <View style={styles.rowDivider} />

                {/* Establecimiento Activo */}
                <View style={styles.cardRow}>
                  <View style={styles.cardIconBox}>
                    <Ionicons name="business-outline" size={18} color="#22c55e" />
                  </View>
                  <View style={styles.cardRowContent}>
                    <Text style={styles.cardRowLabel}>Establecimiento Activo</Text>
                    <Text style={styles.cardRowValue}>
                      {organizationName ?? 'Ninguno seleccionado'}
                    </Text>
                  </View>
                </View>

                <View style={styles.rowDivider} />

                {/* ID de usuario */}
                <View style={styles.cardRow}>
                  <View style={styles.cardIconBox}>
                    <Ionicons name="key-outline" size={18} color="#22c55e" />
                  </View>
                  <View style={styles.cardRowContent}>
                    <Text style={styles.cardRowLabel}>ID de Usuario</Text>
                    <Text style={styles.cardRowValue} numberOfLines={1}>
                      {session?.user.id ?? 'No disponible'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Section 2: SISTEMA Y SINCRONIZACIÓN */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>SISTEMA Y SINCRONIZACIÓN</Text>
              <View style={styles.cardContainer}>
                {/* Pipeline de Eventos */}
                <View style={styles.cardRow}>
                  <View style={styles.cardIconBox}>
                    <Ionicons name="pulse" size={18} color="#22c55e" />
                  </View>
                  <View style={styles.cardRowContent}>
                    <Text style={styles.cardRowLabel}>Pipeline de Eventos</Text>
                    <Text style={styles.cardRowValue}>agropulse-worker</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColors[pipeline.tone].bg }]}>
                    <View style={[styles.statusDot, { backgroundColor: statusColors[pipeline.tone].dot }]} />
                    <Text style={[styles.statusBadgeText, { color: statusColors[pipeline.tone].text }]}>
                      {pipeline.label}
                    </Text>
                  </View>
                </View>

                <View style={styles.rowDivider} />

                {/* Última sincronización */}
                <View style={styles.cardRow}>
                  <View style={styles.cardIconBox}>
                    <Ionicons name="sync-outline" size={18} color="#22c55e" />
                  </View>
                  <View style={styles.cardRowContent}>
                    <Text style={styles.cardRowLabel}>Última Sincronización</Text>
                    <Text style={styles.cardRowValue}>
                      {heartbeat?.last_tick_at
                        ? `Sincronizado a las ${formatLocalTime(new Date(heartbeat.last_tick_at))}`
                        : 'Sin actividad reciente'}
                    </Text>
                  </View>
                </View>

                <View style={styles.rowDivider} />

                {/* Latencia del worker */}
                <View style={styles.cardRow}>
                  <View style={styles.cardIconBox}>
                    <Ionicons name="speedometer-outline" size={18} color="#22c55e" />
                  </View>
                  <View style={styles.cardRowContent}>
                    <Text style={styles.cardRowLabel}>Latencia del Worker</Text>
                    <Text style={styles.cardRowValue}>
                      {lag === null ? 'Sin datos' : `${Math.round(lag)}s de demora`}
                    </Text>
                  </View>
                </View>

                {/* Diagnostics explanation footer */}
                <View style={styles.diagnosticsFooter}>
                  <Ionicons name="information-circle-outline" color="#8ba895" size={15} />
                  <Text style={styles.diagnosticsFooterText}>
                    Monitorea el procesamiento continuo de telemetría y ejecución de riego.
                  </Text>
                </View>
              </View>
            </View>

            {/* Sign out button */}
            <Pressable
              onPress={() => void supabase.auth.signOut()}
              style={({ pressed }) => [styles.signOutButton, pressed && styles.signOutButtonPressed]}
            >
              <Ionicons name="log-out-outline" color="#f87171" size={18} />
              <Text style={styles.signOutText}>Cerrar sesión</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0f1512' },
  content: { padding: 20, gap: 20, paddingBottom: 40 },
  topHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  establishmentCol: {
    flex: 1,
    gap: 3,
  },
  establishmentEyebrow: {
    color: '#86948a',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  establishmentTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  establishmentTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  topAvatar: {
    alignItems: 'center',
    backgroundColor: '#22c55e',
    borderRadius: 999,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  loader: { marginTop: 48 },
  error: { color: '#ef4444', fontSize: 15, lineHeight: 22 },
  heroCard: {
    alignItems: 'center',
    backgroundColor: '#111b15',
    borderColor: 'rgba(34, 197, 94, 0.22)',
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 24,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 3,
  },
  heroAvatarContainer: {
    marginBottom: 14,
  },
  heroAvatar: {
    alignItems: 'center',
    backgroundColor: '#22c55e',
    borderRadius: 22,
    height: 76,
    justifyContent: 'center',
    position: 'relative',
    width: 76,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarStatusBadge: {
    alignItems: 'center',
    backgroundColor: '#0f1512',
    borderRadius: 999,
    bottom: -3,
    height: 18,
    justifyContent: 'center',
    position: 'absolute',
    right: -3,
    width: 18,
  },
  avatarStatusDot: {
    backgroundColor: '#22c55e',
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  heroEmail: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  heroRoleBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.16)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4.5,
  },
  heroRoleText: {
    color: '#22c55e',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroEstRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
  },
  heroEstText: {
    color: '#86948a',
    fontSize: 13,
    fontWeight: '500',
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    color: '#86948a',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  cardContainer: {
    backgroundColor: '#151c17',
    borderColor: '#242e27',
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  cardRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 8,
  },
  cardIconBox: {
    alignItems: 'center',
    backgroundColor: '#122319',
    borderColor: '#1d3527',
    borderRadius: 12,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  cardRowContent: {
    flex: 1,
    gap: 2,
  },
  cardRowLabel: {
    color: '#86948a',
    fontSize: 11.5,
    fontWeight: '500',
  },
  cardRowValue: {
    color: '#ffffff',
    fontSize: 14.5,
    fontWeight: '700',
  },
  rowDivider: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    height: 1,
    marginVertical: 4,
  },
  statusBadge: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusDot: {
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  diagnosticsFooter: {
    alignItems: 'center',
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    paddingTop: 10,
  },
  diagnosticsFooterText: {
    color: '#8ba895',
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
  },
  signOutButton: {
    alignItems: 'center',
    backgroundColor: '#1c1516',
    borderColor: '#301f22',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  signOutButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  signOutText: {
    color: '#f87171',
    fontSize: 15,
    fontWeight: '700',
  },
});
