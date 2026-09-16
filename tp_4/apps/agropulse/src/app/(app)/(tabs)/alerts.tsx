import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatReadingAge } from '@/lib/plot-geometry';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/providers/organization-provider';
import { useSession } from '@/providers/session-provider';

type Reading = {
  measured_at: string;
  soil_moisture_pct: number;
  air_temperature_c: number | null;
};

type Station = {
  id: string;
  name: string;
  readings: Reading[];
};

type Plot = {
  id: string;
  name: string;
  crop: string | null;
  threshold_min: number;
  threshold_max: number;
  stations: Station[];
};

type Alert = {
  id: string;
  plot_id: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'info' | 'warning' | 'critical';
  resolved_at: string | null;
  created_at: string;
  plots?: { name: string } | null;
};

type FilterMode = 'all' | 'unresolved';

export default function AlertsScreen() {
  const router = useRouter();
  const { session } = useSession();
  const {
    selectedOrgId,
    selectedOrganization,
    isLoading: isOrgLoading,
    error: orgError,
    refreshOrganizations,
  } = useOrganization();

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('unresolved');

  const loadData = useCallback(async (organizationId?: string | null) => {
    if (!organizationId) {
      setAlerts([]);
      setPlots([]);
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }
    setError(null);

    try {
      const [plotsResult, alertsResult] = await Promise.all([
        supabase
          .from('plots')
          .select('id, name, crop, threshold_min, threshold_max, stations(id, name, readings(measured_at, soil_moisture_pct, air_temperature_c))')
          .eq('organization_id', organizationId),
        supabase
          .from('plots')
          .select('id')
          .eq('organization_id', organizationId)
          .then(async (res) => {
            if (res.error) return { data: null, error: res.error };
            const pIds = (res.data ?? []).map((p) => p.id);
            if (pIds.length === 0) return { data: [], error: null };
            return supabase
              .from('alerts')
              .select('id, plot_id, message, severity, resolved_at, created_at, plots(name)')
              .in('plot_id', pIds)
              .order('created_at', { ascending: false })
              .limit(50);
          }),
      ]);

      if (plotsResult.error) {
        setError('No se pudieron cargar los datos del establecimiento.');
      } else {
        const mappedPlots = (plotsResult.data ?? []).map((p) => ({
          ...(p as unknown as Plot),
          stations: ((p as unknown as { stations?: Station[] }).stations ?? []).map((s) => ({
            ...s,
            readings: [...(s.readings ?? [])].sort(
              (a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime(),
            ),
          })),
        }));
        setPlots(mappedPlots);
      }

      if (alertsResult.error) {
        setError('No se pudieron cargar las alertas.');
      } else {
        setAlerts((alertsResult.data ?? []) as unknown as Alert[]);
      }
    } catch {
      setError('Error al sincronizar las alertas.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (selectedOrgId) {
      setIsLoading(true);
      void loadData(selectedOrgId);
    } else if (!isOrgLoading) {
      setAlerts([]);
      setPlots([]);
      setIsLoading(false);
    }
  }, [selectedOrgId, isOrgLoading, loadData]);

  // Realtime subscription for alerts and readings
  useEffect(() => {
    if (!selectedOrgId) return;
    let active = true;
    const channel = supabase
      .channel(`alerts-tab-${selectedOrgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => {
        if (active) void loadData(selectedOrgId);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'readings' }, () => {
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

  const plotsMap = useMemo(() => {
    const map = new Map<string, Plot>();
    for (const p of plots) {
      map.set(p.id, p);
    }
    return map;
  }, [plots]);

  const unresolvedAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (a.resolved_at) return false;
      const plot = plotsMap.get(a.plot_id);
      const latestReading = plot?.stations?.[0]?.readings?.[0];
      const isPlotStale = !latestReading || (Date.now() - new Date(latestReading.measured_at).getTime() > 15 * 60 * 1000);

      const msg = a.message.toLowerCase();
      const isDryAlert =
        a.severity === 'critical' ||
        msg.includes('humedad') ||
        msg.includes('regar');
      const isStaleAlert =
        !isDryAlert &&
        (a.severity === 'warning' ||
          msg.includes('estación') ||
          msg.includes('telemetría') ||
          msg.includes('no reportó'));

      // Mutua exclusión estricta de estados activos por lote:
      if (isPlotStale && isDryAlert) return false;
      if (!isPlotStale && isStaleAlert) return false;

      if (
        isDryAlert &&
        latestReading?.soil_moisture_pct != null &&
        plot?.threshold_min != null &&
        latestReading.soil_moisture_pct >= plot.threshold_min
      ) {
        return false;
      }
      return true;
    });
  }, [alerts, plotsMap]);

  const displayedAlerts = useMemo(() => {
    if (filterMode === 'unresolved') return unresolvedAlerts;
    return alerts;
  }, [alerts, unresolvedAlerts, filterMode]);

  const affectedPlotsCount = new Set(unresolvedAlerts.map((a) => a.plot_id)).size;

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
        {/* Title and Filter Row */}
        <View style={styles.titleRow}>
          <View style={styles.titleLeft}>
            <Ionicons name="notifications" size={24} color="#22c55e" />
            <Text style={styles.title}>Alertas</Text>
          </View>
          <Pressable
            style={styles.filterPill}
            onPress={() =>
              setFilterMode((prev) => (prev === 'unresolved' ? 'all' : 'unresolved'))
            }
          >
            <Ionicons name="filter" size={13} color="#86948a" />
            <Text style={styles.filterPillText}>
              {filterMode === 'unresolved'
                ? `Activas (${unresolvedAlerts.length})`
                : `Todas (${alerts.length})`}
            </Text>
          </Pressable>
        </View>

        {/* Attention Required Banner */}
        {unresolvedAlerts.length > 0 && (
          <View style={styles.attentionBanner}>
            <View style={styles.attentionLeft}>
              <View style={styles.attentionIconBox}>
                <Ionicons name="warning-outline" color="#ef4444" size={22} />
              </View>
              <View style={styles.attentionTexts}>
                <Text style={styles.attentionTitle}>Atención requerida</Text>
                <Text style={styles.attentionSubtitle}>
                  {affectedPlotsCount}{' '}
                  {affectedPlotsCount === 1
                    ? 'zona requiere verificación en campo'
                    : 'zonas requieren verificación en campo'}
                </Text>
              </View>
            </View>
            <View style={styles.attentionDot} />
          </View>
        )}

        {isLoading && (
          <ActivityIndicator color="#22c55e" size="large" style={styles.loader} />
        )}
        {error && <Text style={styles.error}>{error}</Text>}

        {/* Alert Cards */}
        {!isLoading &&
          displayedAlerts.map((alert) => {
            const plot = plotsMap.get(alert.plot_id);

            return (
              <AlertCardItem
                key={alert.id}
                alert={alert}
                plot={plot}
              />
            );
          })}

        {/* Normal Operations Banner: shown only when there are no alerts */}
        {!isLoading && !error && displayedAlerts.length === 0 && (
          <View style={styles.bottomBanner}>
            <View style={styles.bottomBannerIconContainer}>
              <Ionicons
                name="shield-checkmark-outline"
                size={28}
                color="#86948a"
              />
            </View>
            <Text style={styles.bottomBannerText}>
              Todas las estaciones operando con normalidad
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function AlertCardItem({
  alert,
  plot,
}: {
  alert: Alert;
  plot?: Plot;
}) {
  const plotName = plot?.name ?? (alert.plots as { name?: string })?.name ?? 'Lote';
  const latestReading = plot?.stations?.[0]?.readings?.[0];
  const thresholdMin = plot?.threshold_min ?? 25;

  // Determine alert nature based on severity / message
  const msg = alert.message.toLowerCase();
  const isDryAlert =
    alert.severity === 'critical' ||
    msg.includes('humedad') ||
    msg.includes('regar');
  const isStaleAlert =
    !isDryAlert &&
    (alert.severity === 'warning' ||
      msg.includes('estación') ||
      msg.includes('telemetría') ||
      msg.includes('no reportó'));

  const isPlotStale =
    !latestReading ||
    Date.now() - new Date(latestReading.measured_at).getTime() > 15 * 60 * 1000;

  const isAutoResolved =
    (isDryAlert && isPlotStale) ||
    (isStaleAlert && !isPlotStale) ||
    (isDryAlert &&
      latestReading?.soil_moisture_pct != null &&
      thresholdMin != null &&
      latestReading.soil_moisture_pct >= thresholdMin);

  const isResolved = Boolean(alert.resolved_at) || isAutoResolved;

  // Moisture data: extract percentage recorded in alert message, or fallback to reading
  const moistureMatch = alert.message.match(/(\d+(?:\.\d+)?)%/);
  const recordedMoisture = moistureMatch ? Math.round(Number(moistureMatch[1])) : null;
  const displayMoisture =
    recordedMoisture ??
    (latestReading?.soil_moisture_pct != null
      ? Math.round(latestReading.soil_moisture_pct)
      : 18);

  // Connection age for stale alert
  const connectionAgeRaw = latestReading?.measured_at
    ? formatReadingAge(latestReading.measured_at)
    : formatReadingAge(alert.created_at);
  const connectionAge = connectionAgeRaw.startsWith('hace')
    ? 'Hace' + connectionAgeRaw.slice(4)
    : connectionAgeRaw;

  // Stale station name extraction
  const stationMatch = alert.message.match(/"([^"]+)"/);
  const stationName =
    stationMatch?.[1] ?? plot?.stations?.[0]?.name ?? plotName;

  if (isDryAlert) {
    return (
      <View style={[styles.card, isResolved && styles.cardResolved]}>
        <View
          style={[
            styles.cardAccentBar,
            { backgroundColor: isResolved ? '#22c55e' : '#ef4444' },
          ]}
        />
        <View style={styles.cardContent}>
          {/* Header */}
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardCategoryLeft}>
              <Ionicons
                name="water-outline"
                size={17}
                color={isResolved ? '#22c55e' : '#ef4444'}
              />
              <Text
                style={[
                  styles.cardCategoryText,
                  { color: isResolved ? '#22c55e' : '#ef4444' },
                ]}
              >
                HUMEDAD BAJA
              </Text>
            </View>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: isResolved
                    ? 'rgba(34, 197, 94, 0.15)'
                    : 'rgba(239, 68, 68, 0.15)',
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: isResolved ? '#22c55e' : '#ef4444' },
                ]}
              >
                {isResolved ? 'Resuelta' : 'Crítico'}
              </Text>
            </View>
          </View>

          {/* Plot Name */}
          <Text style={styles.cardTitle}>{plotName}</Text>

          {/* Metrics */}
          <View style={styles.moistureRow}>
            <Text
              style={[
                styles.moistureBigText,
                isResolved && { color: '#22c55e' },
              ]}
            >
              {isResolved && latestReading?.soil_moisture_pct != null
                ? `${Math.round(latestReading.soil_moisture_pct)}%`
                : `${displayMoisture}%`}
            </Text>
            <Text style={styles.moistureLabel}>
              {isResolved ? 'Humedad actual (normalizada)' : 'Humedad registrada'}
            </Text>
          </View>
          <Text style={styles.thresholdText}>
            Umbral mínimo configurado: {thresholdMin}%
          </Text>

          {/* Suggestion Callout */}
          <View style={styles.suggestionBox}>
            <Ionicons
              name={isResolved ? 'checkmark-circle-outline' : 'bulb-outline'}
              size={16}
              color="#22c55e"
            />
            <Text style={styles.suggestionText}>
              <Text style={styles.suggestionPrefix}>
                {isResolved ? 'Estado: ' : 'Sugerencia: '}
              </Text>
              {isResolved
                ? 'Humedad normalizada por encima del umbral mínimo.'
                : 'Considerar riego inmediato para evitar estrés hídrico en el lote.'}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (isStaleAlert) {
    return (
      <View style={[styles.card, isResolved && styles.cardResolved]}>
        <View style={[styles.cardAccentBar, { backgroundColor: '#64748b' }]} />
        <View style={styles.cardContent}>
          {/* Header */}
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardCategoryLeft}>
              <Ionicons name="cloud-offline-outline" size={17} color="#94a3b8" />
              <Text style={[styles.cardCategoryText, { color: '#94a3b8' }]}>
                ESTACIÓN SIN DATOS
              </Text>
            </View>
            <View
              style={[
                styles.badge,
                { backgroundColor: 'rgba(148, 163, 184, 0.15)' },
              ]}
            >
              <Text style={[styles.badgeText, { color: '#94a3b8' }]}>
                {isResolved ? 'Resuelta' : 'Stale'}
              </Text>
            </View>
          </View>

          {/* Station/Plot Name */}
          <Text style={styles.cardTitle}>{stationName}</Text>

          {/* Description */}
          <Text style={styles.staleDescription}>
            {alert.message.includes('15 minutos')
              ? 'No se reciben lecturas de telemetría hace más de 15 minutos. Verifique batería o panel solar.'
              : alert.message}
          </Text>

          {/* Connection Age */}
          <View style={styles.lastConnectionRow}>
            <Ionicons name="time-outline" size={15} color="#94a3b8" />
            <Text style={styles.lastConnectionText}>
              Última conexión: {connectionAge}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // Generic / Informational alert fallback
  return (
    <View style={[styles.card, isResolved && styles.cardResolved]}>
      <View style={[styles.cardAccentBar, { backgroundColor: '#3b82f6' }]} />
      <View style={styles.cardContent}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardCategoryLeft}>
            <Ionicons
              name="information-circle-outline"
              size={17}
              color="#3b82f6"
            />
            <Text style={[styles.cardCategoryText, { color: '#3b82f6' }]}>
              INFORMACIÓN
            </Text>
          </View>
          <View
            style={[
              styles.badge,
              { backgroundColor: 'rgba(59, 130, 246, 0.15)' },
            ]}
          >
            <Text style={[styles.badgeText, { color: '#3b82f6' }]}>
              {isResolved ? 'Resuelta' : 'Informativa'}
            </Text>
          </View>
        </View>
        <Text style={styles.cardTitle}>{plotName}</Text>
        <Text style={styles.staleDescription}>{alert.message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0f1512',
  },
  content: {
    padding: 20,
    gap: 14,
    paddingBottom: 40,
  },
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
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  titleLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  title: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  filterPill: {
    alignItems: 'center',
    backgroundColor: '#18201c',
    borderColor: '#232d27',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterPillText: {
    color: '#86948a',
    fontSize: 12,
    fontWeight: '700',
  },
  attentionBanner: {
    alignItems: 'center',
    backgroundColor: '#161d19',
    borderColor: '#232d27',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
  },
  attentionLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  attentionIconBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  attentionTexts: {
    flex: 1,
  },
  attentionTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  attentionSubtitle: {
    color: '#86948a',
    fontSize: 12.5,
    marginTop: 2,
  },
  attentionDot: {
    backgroundColor: '#f87171',
    borderRadius: 5,
    height: 9,
    width: 9,
  },
  card: {
    backgroundColor: '#161c19',
    borderColor: '#222c26',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  cardResolved: {
    backgroundColor: '#121815',
    borderColor: '#1a221d',
    opacity: 0.7,
  },
  cardAccentBar: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 4,
  },
  cardContent: {
    gap: 10,
    padding: 16,
    paddingLeft: 18,
  },
  cardHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardCategoryLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  cardCategoryText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  moistureRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  moistureBigText: {
    color: '#ef4444',
    fontSize: 26,
    fontWeight: '800',
  },
  moistureLabel: {
    color: '#86948a',
    fontSize: 13,
    fontWeight: '500',
  },
  thresholdText: {
    color: '#86948a',
    fontSize: 13,
  },
  suggestionBox: {
    alignItems: 'flex-start',
    backgroundColor: '#121d17',
    borderColor: 'rgba(34, 197, 94, 0.18)',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    padding: 12,
  },
  suggestionText: {
    color: '#dee4df',
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
  },
  suggestionPrefix: {
    color: '#22c55e',
    fontWeight: '700',
  },
  staleDescription: {
    color: '#c4cec7',
    fontSize: 13.5,
    lineHeight: 20,
  },
  lastConnectionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  lastConnectionText: {
    color: '#86948a',
    fontSize: 13.5,
  },
  bottomBanner: {
    alignItems: 'center',
    backgroundColor: '#141a17',
    borderColor: '#202923',
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    marginTop: 6,
    padding: 20,
  },
  bottomBannerIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBannerText: {
    color: '#86948a',
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: 16,
    textAlign: 'center',
  },
  loader: {
    marginTop: 48,
  },
  error: {
    color: '#ef4444',
    fontSize: 14,
    lineHeight: 20,
  },
  modalOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#171d1a',
    borderColor: '#252f29',
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 20,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  modalOrgItem: {
    alignItems: 'center',
    backgroundColor: '#101613',
    borderColor: '#222b25',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
  },
  modalOrgItemSelected: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderColor: '#22c55e',
  },
  modalOrgText: {
    color: '#dee4df',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOrgTextSelected: {
    color: '#22c55e',
    fontWeight: '800',
  },
});


