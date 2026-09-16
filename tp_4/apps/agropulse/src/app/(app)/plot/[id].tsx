import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { computePlotStatus, DEFAULT_STALE_AGE_MS, formatReadingAge, type PlotStatus } from '@/lib/plot-geometry';
import { supabase } from '@/lib/supabase';
import { filterAndOrderHistory, toMoistureChartData, type TelemetryReading } from '@/lib/telemetry';
import { validateThresholds } from '@/lib/threshold-validation';
import { createClientRequestId, describeCommandStatus, validateCommandDuration, type CommandStatus } from '@/lib/irrigation-command';
import { getAgronomicSuggestion } from '@/lib/agronomic-suggestion';
import { useSession } from '@/providers/session-provider';
import { Ionicons } from '@expo/vector-icons';

const LOAD_TIMEOUT_MS = 15_000;
const COMMAND_TIMEOUT_MS = 10_000;

type Reading = TelemetryReading & { air_temperature_c: number | null };
type WeatherReading = { measured_at: string; rainfall_mm: number };
type Valve = { id: string; name: string; state: 'open' | 'closed'; station_id: string | null };
type IrrigationCommand = { id: string; valve_id: string; action: 'open' | 'close'; duration_minutes: number; status: CommandStatus; client_request_id: string; created_at: string; applied_at: string | null; requested_by?: string | null };
type Plot = { id: string; name: string; crop: string | null; threshold_min: number; threshold_max: number; stations: { id: string; name: string; external_id: string | null; readings: Reading[]; weather_readings: WeatherReading[] }[]; valves: Valve[] };
type MembershipRole = 'producer' | 'operator' | 'advisor';
const statusMeta: Record<PlotStatus, { label: string; color: string; bg: string; border: string }> = {
  stale: { label: 'Sin datos', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.15)', border: 'rgba(107, 114, 128, 0.3)' },
  dry: { label: 'Seco', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)' },
  optimal: { label: 'Óptimo', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.3)' },
  wet: { label: 'Húmedo', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)' },
};
const isUuid = (value: string | undefined): value is string => Boolean(value && /^[0-9a-f-]{36}$/i.test(value));

export default function PlotDetailScreen() {
  const router = useRouter();
  const { session } = useSession();
  const params = useLocalSearchParams<{ id?: string; organizationId?: string }>();
  const plotId = typeof params.id === 'string' ? params.id : undefined;
  const organizationId = typeof params.organizationId === 'string' ? params.organizationId : undefined;
  const [plot, setPlot] = useState<Plot | null>(null);
  const [role, setRole] = useState<MembershipRole | null>(null);
  const [minimumInput, setMinimumInput] = useState('');
  const [maximumInput, setMaximumInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [commands, setCommands] = useState<IrrigationCommand[]>([]);
  const [durations, setDurations] = useState<Record<string, string>>({});
  const [commandBusy, setCommandBusy] = useState<string | null>(null);
  const [commandMessage, setCommandMessage] = useState<string | null>(null);
  const validation = useMemo(() => validateThresholds(minimumInput, maximumInput), [minimumInput, maximumInput]);
  const canEditThresholds = role === 'producer' || role === 'operator';

  const loadPlot = useCallback(async (refresh = false, syncDraft = false) => {
    if (!isUuid(plotId) || !isUuid(organizationId)) { setError('El enlace a este lote no es válido. Volvé a la lista de lotes e intentá de nuevo.'); setIsLoading(false); setIsRefreshing(false); return; }
    if (refresh) setIsRefreshing(true); else setIsLoading(true);
    setError(null);
    const timeout = setTimeout(() => { setIsLoading(false); setIsRefreshing(false); setError('Tiempo de espera agotado. Deslizá hacia abajo para reintentar.'); }, LOAD_TIMEOUT_MS);
    try {
      const [plotResult, membershipResult] = await Promise.all([
        supabase.from('plots').select('id, name, crop, threshold_min, threshold_max, stations(id, name, external_id, readings(measured_at, soil_moisture_pct, air_temperature_c), weather_readings(measured_at, rainfall_mm)), valves(id, name, state, station_id)').eq('id', plotId).eq('organization_id', organizationId).maybeSingle(),
        session ? supabase.from('memberships').select('role').eq('organization_id', organizationId).eq('user_id', session.user.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
      ]);
      clearTimeout(timeout);
      if (plotResult.error) setError('No se pudo cargar la telemetría del lote. Comprobá tu conexión e intentá de nuevo.');
      else if (!plotResult.data) setError('Este lote no está disponible en el establecimiento seleccionado.');
      else {
        const nextPlot = plotResult.data as unknown as Plot;
        setPlot(nextPlot);
        const valveIds = nextPlot.valves.map((valve) => valve.id);
        if (valveIds.length) {
          const commandResult = await supabase.from('irrigation_commands').select('id, valve_id, action, duration_minutes, status, client_request_id, created_at, applied_at, requested_by').in('valve_id', valveIds).order('created_at', { ascending: false }).limit(20);
          if (commandResult.error) setError('No se pudo cargar el historial de comandos de válvulas. Comprobá tu conexión e intentá de nuevo.');
          else setCommands((commandResult.data ?? []) as IrrigationCommand[]);
        } else setCommands([]);
        if (syncDraft) { setMinimumInput(String(nextPlot.threshold_min)); setMaximumInput(String(nextPlot.threshold_max)); }
      }
      setRole((membershipResult.data as { role?: MembershipRole } | null)?.role ?? null);
    } catch {
      clearTimeout(timeout);
      setError('No se pudo cargar la telemetría del lote. Comprobá tu conexión e intentá de nuevo.');
    }
    setIsLoading(false); setIsRefreshing(false);
  }, [organizationId, plotId, session]);

  useEffect(() => { const timer = setTimeout(() => { void loadPlot(false, true); }, 0); return () => clearTimeout(timer); }, [loadPlot]);

  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);

  const station = useMemo(() => {
    if (!plot?.stations?.length) return null;
    if (selectedStationId) {
      return plot.stations.find((s) => s.id === selectedStationId) ?? plot.stations[0];
    }
    return plot.stations[0];
  }, [plot?.stations, selectedStationId]);

  const stationIds = useMemo(() => plot?.stations?.map((s) => s.id) ?? [], [plot?.stations]);

  useEffect(() => {
    if (!isUuid(plotId) || !stationIds.length) return;
    let active = true;
    const channel = supabase.channel(`plot-telemetry-${plotId}`);
    stationIds.forEach((sid) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'readings', filter: `station_id=eq.${sid}` }, () => { if (active) void loadPlot(true); });
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'weather_readings', filter: `station_id=eq.${sid}` }, () => { if (active) void loadPlot(true); });
    });
    channel.subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [loadPlot, plotId, stationIds]);

  const valveIdsKey = plot?.valves.map((valve) => valve.id).join(',') ?? '';
  useEffect(() => {
    if (!isUuid(plotId) || !valveIdsKey) return;
    let active = true;
    const channel = supabase.channel(`plot-irrigation-${plotId}`);
    valveIdsKey.split(',').forEach((valveId) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'valves', filter: `id=eq.${valveId}` }, () => { if (active) void loadPlot(true); });
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'irrigation_commands', filter: `valve_id=eq.${valveId}` }, () => { if (active) void loadPlot(true); });
    });
    channel.subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [loadPlot, plotId, valveIdsKey]);

  const readings = useMemo(() => filterAndOrderHistory(station?.readings ?? []), [station?.readings]);
  const latest = station?.readings.filter((reading) => Number.isFinite(new Date(reading.measured_at).getTime()) && Number.isFinite(Number(reading.soil_moisture_pct))).slice().sort((a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime())[0] ?? null;
  const status = plot
    ? computePlotStatus(
        latest?.soil_moisture_pct ?? null,
        latest?.measured_at ?? null,
        Number(plot.threshold_min),
        Number(plot.threshold_max),
        Date.now(),
        DEFAULT_STALE_AGE_MS,
      )
    : 'stale';
  const chart = plot ? toMoistureChartData(readings, Number(plot.threshold_min), Number(plot.threshold_max)) : null;
  const rainfall = station?.weather_readings?.slice().sort((a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime())[0] ?? null;
  const suggestion = plot ? getAgronomicSuggestion(latest?.soil_moisture_pct ?? null, Number(plot.threshold_min)) : null;

  async function saveThresholds() {
    if (!plot || !isUuid(plotId) || !isUuid(organizationId) || !canEditThresholds || !validation.valid || isSaving) return;
    setIsSaving(true); setSaveMessage(null); setError(null);
    const result = await supabase.from('plots').update({ threshold_min: validation.minimum, threshold_max: validation.maximum }).eq('id', plotId).eq('organization_id', organizationId).select('threshold_min, threshold_max').maybeSingle();
    if (result.error || !result.data) {
      setError('No se pudieron guardar los umbrales. Comprobá tus permisos y conexión, luego intentá de nuevo.');
    } else {
      setSaveMessage('Umbrales guardados exitosamente.');
      await loadPlot(true, true);
    }
    setIsSaving(false);
  }

  function navigateToConfirm(valve: Valve, action: 'open' | 'close') {
    if (!canEditThresholds || !isUuid(valve.id)) return;
    if (action === 'open' && valve.state === 'open') {
      setCommandMessage('La válvula ya se encuentra abierta.');
      return;
    }
    if (action === 'close' && valve.state === 'closed') {
      setCommandMessage('La válvula ya se encuentra cerrada.');
      return;
    }
    const duration = validateCommandDuration(durations[valve.id] ?? '');
    if (action === 'open' && (!duration.valid || duration.value === null)) { setCommandMessage(duration.error); return; }
    if (commands.some((command) => command.valve_id === valve.id && command.status === 'pending')) {
      setCommandMessage('Ya hay un comando pendiente para esta válvula. Esperá a que finalice.');
      return;
    }
    setCommandMessage(null);
    router.push({
      pathname: '/confirm-command' as any,
      params: {
        plotName: plot?.name ?? 'Desconocido',
        valveName: valve.name,
        valveId: valve.id,
        action,
        durationMinutes: action === 'close' ? '1' : String(duration.value),
        clientRequestId: createClientRequestId(),
      },
    });
  }

  async function cancelCommand(commandId: string) {
    if (commandBusy) return;
    setCommandBusy(commandId); setCommandMessage(null);
    const timeout = setTimeout(() => { setCommandBusy(null); setCommandMessage('La solicitud de cancelación superó el tiempo de espera.'); }, COMMAND_TIMEOUT_MS);
    try {
      const result = await supabase.from('irrigation_commands').update({ status: 'cancelled' }).eq('id', commandId).eq('status', 'pending');
      clearTimeout(timeout);
      if (result.error) setCommandMessage('No se pudo cancelar el comando. Comprobá tus permisos.');
      else { setCommandMessage('Comando cancelado exitosamente.'); await loadPlot(true); }
    } catch {
      clearTimeout(timeout);
      setCommandMessage('No se pudo cancelar el comando.');
    }
    setCommandBusy(null);
  }

  if (isLoading) return <Screen><ActivityIndicator color="#22c55e" size="large" style={styles.loader} /></Screen>;
  return <Screen refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadPlot(true)} tintColor="#22c55e" />}>
    <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backRow}>
      <Ionicons name="chevron-back" color="#22c55e" size={20} />
      <Text style={styles.back}>Volver a lotes</Text>
    </Pressable>
    {error && !plot ? <View style={styles.empty}><Text style={styles.title}>Telemetría no disponible</Text><Text accessibilityLiveRegion="polite" style={styles.body}>{error}</Text><Pressable onPress={() => void loadPlot(true)} style={styles.retry}><Text style={styles.retryText}>Reintentar</Text></Pressable></View> : plot && <>
      <View style={styles.headerSection}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>DETALLE DE LOTE / TELEMETRÍA</Text>
          <Text style={styles.title}>{plot.name}</Text>
          <Text style={styles.crop}>{plot.crop ?? 'Sin cultivo especificado'}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: statusMeta[status].bg, borderColor: statusMeta[status].border }]}>
          <View style={[styles.statusDot, { backgroundColor: statusMeta[status].color }]} />
          <Text style={[styles.statusText, { color: statusMeta[status].color }]}>{statusMeta[status].label}</Text>
        </View>
      </View>

      {/* RF-22: Agronomic suggestion */}
      {suggestion && (
        <View style={styles.suggestionBanner}>
          <Ionicons name="bulb" color="#22c55e" size={20} />
          <View style={{ flex: 1 }}>
            <Text style={styles.suggestionTitle}>Sugerencia Agronómica</Text>
            <Text style={styles.suggestionText}>{suggestion}</Text>
          </View>
        </View>
      )}

      {/* Main Stats 2-column Grid */}
      <View style={styles.metrics}>
        <Metric
          label="Humedad del suelo"
          value={latest ? `${latest.soil_moisture_pct}%` : 'No disponible'}
          subLabel={statusMeta[status].label}
          color={statusMeta[status].color}
          icon="water-outline"
        />
        <Metric
          label="Temperatura del aire"
          value={latest?.air_temperature_c != null ? `${latest.air_temperature_c}°C` : 'No disponible'}
          subLabel="Lectura de estación"
          color="#ffffff"
          icon="thermometer-outline"
        />
      </View>

      {/* Historical Moisture Chart */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Ionicons name="analytics-outline" color="#22c55e" size={18} />
          <Text style={styles.sectionTitle}>Humedad / últimas 6 horas</Text>
        </View>
        <Text style={styles.caption}>{station ? `${station.name} · ${readings.length} lecturas` : 'Sin estación asignada'}</Text>
        {chart && <MoistureChart data={chart} />}
      </View>

      {!readings.length && (
        <View style={styles.empty}>
          <Text style={styles.cardTitle}>Sin lecturas aún</Text>
          <Text style={styles.body}>La estación no ha reportado una lectura válida en las últimas seis horas.</Text>
        </View>
      )}

      {/* Moisture Thresholds */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Ionicons name="options-outline" color="#22c55e" size={18} />
          <Text style={styles.sectionTitle}>Umbrales de humedad de suelo</Text>
        </View>
        {canEditThresholds ? (
          <>
            <ThresholdInput label="Mínimo" value={minimumInput} onChangeText={setMinimumInput} error={validation.minimumError} />
            <ThresholdInput label="Máximo" value={maximumInput} onChangeText={setMaximumInput} error={validation.maximumError} />
            {validation.rangeError && <Text accessibilityLiveRegion="polite" style={styles.validationError}>{validation.rangeError}</Text>}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !validation.valid || isSaving }}
              disabled={!validation.valid || isSaving}
              onPress={() => void saveThresholds()}
              style={[styles.saveButton, (!validation.valid || isSaving) && styles.saveButtonDisabled]}
            >
              <Text style={styles.saveButtonText}>{isSaving ? 'Guardando…' : 'Guardar cambios'}</Text>
            </Pressable>
            {saveMessage && <Text accessibilityLiveRegion="polite" style={styles.success}>{saveMessage}</Text>}
          </>
        ) : (
          <InfoRow label="Rango actual" value={`${plot.threshold_min}% – ${plot.threshold_max}%`} />
        )}
      </View>

      {error && <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}

      {/* Station & Rainfall */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Ionicons name="hardware-chip-outline" color="#22c55e" size={18} />
          <Text style={styles.sectionTitle}>
            {plot?.stations && plot.stations.length > 1
              ? `Estaciones de monitoreo (${plot.stations.length})`
              : 'Estación de monitoreo'}
          </Text>
        </View>

        {plot?.stations && plot.stations.length > 1 && (
          <View style={styles.stationChipsContainer}>
            {plot.stations.map((s) => {
              const isSelected = s.id === station?.id;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => setSelectedStationId(s.id)}
                  style={[styles.stationChip, isSelected && styles.stationChipSelected]}
                >
                  <Ionicons
                    name="hardware-chip"
                    size={13}
                    color={isSelected ? '#003824' : '#8ba895'}
                  />
                  <Text style={[styles.stationChipText, isSelected && styles.stationChipTextSelected]}>
                    {s.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <InfoRow label={plot?.stations && plot.stations.length > 1 ? 'Estación seleccionada' : 'Estación'} value={station?.name ?? 'Sin estación'} />
        <InfoRow label="Última precipitación" value={rainfall ? `${rainfall.rainfall_mm} mm · ${formatReadingAge(rainfall.measured_at)}` : 'Sin datos climáticos'} />
        <InfoRow label="Antigüedad lectura" value={formatReadingAge(latest?.measured_at ?? null)} />
      </View>

      {/* RF-21: Manual reading button */}
      {canEditThresholds && station && (
        <Pressable
          onPress={() => router.push({ pathname: '/manual-reading' as any, params: { stationId: station.id, plotName: plot.name } })}
          style={styles.manualReadingButton}
        >
          <Ionicons name="create-outline" color="#22c55e" size={18} />
          <Text style={styles.manualReadingText}>Cargar lectura manual</Text>
        </Pressable>
      )}

      {/* Valves Section */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Ionicons name="water" color="#22c55e" size={18} />
          <Text style={styles.sectionTitle}>Válvulas de riego</Text>
        </View>
        <Text style={styles.caption}>
          {canEditThresholds ? 'Los comandos son aplicados por el worker de riego en segundo plano.' : 'Acceso de solo lectura: controles de comando deshabilitados.'}
        </Text>
        {!plot.valves.length && <Text style={irrigationStyles.bodyDark}>No hay válvulas asignadas a este lote.</Text>}
        {plot.valves.map((valve) => (
          <ValveCard
            key={valve.id}
            valve={valve}
            commands={commands}
            duration={durations[valve.id] ?? ''}
            canOperate={canEditThresholds}
            busy={commandBusy === valve.id}
            onDurationChange={(value) => setDurations((current) => ({ ...current, [valve.id]: value }))}
            onCommand={(action) => navigateToConfirm(valve, action)}
            onCancel={(commandId) => void cancelCommand(commandId)}
          />
        ))}
        {commandMessage && <Text accessibilityLiveRegion="polite" style={irrigationStyles.commandMessage}>{commandMessage}</Text>}
      </View>

      {/* Command History */}
      <View style={timelineStyles.section}>
        <View style={timelineStyles.header}>
          <Text style={timelineStyles.title}>Historial de Comandos</Text>
          <Text style={timelineStyles.subtitle}>Registro cronológico de comandos de válvulas del lote.</Text>
        </View>
        {commands.length ? (
          <View style={timelineStyles.list}>
            {commands.map((command, index) => (
              <CommandTimelineItem
                key={command.id}
                command={command}
                valveName={plot.valves.find((valve) => valve.id === command.valve_id)?.name ?? 'Válvula'}
                plotName={plot.name}
                isFirst={index === 0}
                isLast={index === commands.length - 1}
                currentUserId={session?.user?.id}
                currentUserEmail={session?.user?.email}
                canOperate={canEditThresholds}
                onCancel={(commandId) => void cancelCommand(commandId)}
                busy={commandBusy === command.id}
              />
            ))}
          </View>
        ) : (
          <View style={timelineStyles.emptyCard}>
            <Ionicons name="time-outline" color="#86948a" size={24} />
            <Text style={timelineStyles.emptyText}>Sin comandos de riego registrados para este lote.</Text>
          </View>
        )}
      </View>

      <Text style={styles.footer}>Las lecturas en vivo se actualizan automáticamente. Deslizá hacia abajo para refrescar.</Text>
    </>}
  </Screen>;
}

function ThresholdInput({ label, value, onChangeText, error }: { label: string; value: string; onChangeText: (value: string) => void; error: string | null }) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label} (%)</Text>
      <TextInput
        accessibilityLabel={`Porcentaje de umbral de humedad ${label}`}
        accessibilityHint="Ingresá un número de 0 a 100"
        keyboardType="decimal-pad"
        value={value}
        onChangeText={onChangeText}
        style={styles.input}
      />
      <Text accessibilityLiveRegion="polite" style={styles.validationError}>{error ?? ' '}</Text>
    </View>
  );
}

function Screen({ children, refreshControl }: { children: React.ReactNode; refreshControl?: React.ReactElement<React.ComponentProps<typeof RefreshControl>> }) {
  return <SafeAreaView style={styles.screen}><ScrollView refreshControl={refreshControl} contentContainerStyle={styles.content}>{children}</ScrollView></SafeAreaView>;
}

function Metric({ label, value, subLabel, color, icon }: { label: string; value: string; subLabel?: string; color?: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.metric}>
      <View style={styles.metricHeader}>
        <Ionicons name={icon} size={15} color={color ?? '#86948a'} />
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
      <Text style={[styles.metricValue, color ? { color } : undefined]}>{value}</Text>
      {subLabel && <Text style={styles.metricSub}>{subLabel}</Text>}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function ValveCard({ valve, commands, duration, canOperate, busy, onDurationChange, onCommand, onCancel }: { valve: Valve; commands: IrrigationCommand[]; duration: string; canOperate: boolean; busy: boolean; onDurationChange: (value: string) => void; onCommand: (action: 'open' | 'close') => void; onCancel: (commandId: string) => void }) {
  const pendingCommand = commands.find((command) => command.valve_id === valve.id && command.status === 'pending');
  const durationValidation = validateCommandDuration(duration);
  const isOpen = valve.state === 'open';
  return (
    <View style={irrigationStyles.valveRow}>
      <View style={irrigationStyles.valveHeader}>
        <View style={irrigationStyles.valveTitleRow}>
          <View style={[irrigationStyles.valveIndicator, { backgroundColor: isOpen ? '#22c55e' : '#6b7280' }]} />
          <Text style={irrigationStyles.valveName}>{valve.name}</Text>
        </View>
        <Text style={[irrigationStyles.valveState, { color: isOpen ? '#22c55e' : '#86948a' }]}>
          {isOpen ? 'ABIERTA' : 'CERRADA'}
        </Text>
      </View>
      {canOperate && (
        <>
          <TextInput
            accessibilityLabel={`Duración de comando para ${valve.name} en minutos`}
            accessibilityHint="Ingresá un entero de 1 a 120 minutos"
            keyboardType="number-pad"
            placeholder="Duración en minutos (ej. 30)"
            placeholderTextColor="#5a6860"
            value={duration}
            onChangeText={onDurationChange}
            style={irrigationStyles.durationInput}
          />
          {duration.length > 0 && <Text style={irrigationStyles.validationError}>{durationValidation.error}</Text>}
          <View style={irrigationStyles.commandButtons}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: busy || Boolean(pendingCommand) || isOpen || !durationValidation.valid }}
              disabled={busy || Boolean(pendingCommand) || isOpen || !durationValidation.valid}
              onPress={() => onCommand('open')}
              style={[irrigationStyles.commandButton, irrigationStyles.openButton, (busy || Boolean(pendingCommand) || isOpen || !durationValidation.valid) && irrigationStyles.commandButtonDisabled]}
            >
              <Text style={irrigationStyles.openButtonText}>Abrir (Regar)</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: busy || Boolean(pendingCommand) || !isOpen }}
              disabled={busy || Boolean(pendingCommand) || !isOpen}
              onPress={() => onCommand('close')}
              style={[irrigationStyles.commandButton, irrigationStyles.closeButton, (busy || Boolean(pendingCommand) || !isOpen) && irrigationStyles.commandButtonDisabled]}
            >
              <Text style={irrigationStyles.closeButtonText}>Cerrar</Text>
            </Pressable>
          </View>
          {pendingCommand && (
            <View style={irrigationStyles.pendingRow}>
              <Text style={irrigationStyles.pendingHint}>Comando pendiente para esta válvula.</Text>
              <Pressable onPress={() => onCancel(pendingCommand.id)} disabled={busy} style={[irrigationStyles.cancelButton, busy && irrigationStyles.commandButtonDisabled]}>
                {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={irrigationStyles.cancelButtonText}>Cancelar</Text>}
              </Pressable>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const commandStatusMeta: Record<
  CommandStatus,
  {
    label: string;
    actionColor: string;
    badgeColor: string;
    badgeBg: string;
    badgeBorder: string;
    nodeBg: string;
    nodeBorder: string;
    nodeIcon: keyof typeof Ionicons.glyphMap;
    badgeIcon: keyof typeof Ionicons.glyphMap;
  }
> = {
  applied: {
    label: 'APPLIED',
    actionColor: '#22c55e',
    badgeColor: '#22c55e',
    badgeBg: 'rgba(34, 197, 94, 0.15)',
    badgeBorder: 'rgba(34, 197, 94, 0.35)',
    nodeBg: '#10251a',
    nodeBorder: '#22c55e',
    nodeIcon: 'checkmark',
    badgeIcon: 'checkmark',
  },
  pending: {
    label: 'PENDING',
    actionColor: '#60a5fa',
    badgeColor: '#60a5fa',
    badgeBg: 'rgba(59, 130, 246, 0.15)',
    badgeBorder: 'rgba(59, 130, 246, 0.35)',
    nodeBg: '#101d2d',
    nodeBorder: '#3b82f6',
    nodeIcon: 'hourglass-outline',
    badgeIcon: 'hourglass-outline',
  },
  failed: {
    label: 'FAILED',
    actionColor: '#ef4444',
    badgeColor: '#ef4444',
    badgeBg: 'rgba(239, 68, 68, 0.15)',
    badgeBorder: 'rgba(239, 68, 68, 0.35)',
    nodeBg: '#2a1414',
    nodeBorder: '#ef4444',
    nodeIcon: 'warning-outline',
    badgeIcon: 'time-outline',
  },
  cancelled: {
    label: 'CANCELLED',
    actionColor: '#94a3b8',
    badgeColor: '#94a3b8',
    badgeBg: 'rgba(148, 163, 184, 0.12)',
    badgeBorder: 'rgba(148, 163, 184, 0.25)',
    nodeBg: '#19201c',
    nodeBorder: '#64748b',
    nodeIcon: 'close',
    badgeIcon: 'close',
  },
};

function formatCommandDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Hora no disponible';

  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const time = `${hours}:${minutes} hs`;

  if (isToday) return `Hoy, ${time}`;
  if (isYesterday) return `Ayer, ${time}`;

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${day}/${month}, ${time}`;
}

function CommandTimelineItem({
  command,
  valveName,
  plotName,
  isFirst,
  isLast,
  currentUserId,
  currentUserEmail,
  canOperate,
  onCancel,
  busy,
}: {
  command: IrrigationCommand;
  valveName: string;
  plotName: string;
  isFirst: boolean;
  isLast: boolean;
  currentUserId?: string;
  currentUserEmail?: string;
  canOperate: boolean;
  onCancel: (id: string) => void;
  busy: boolean;
}) {
  const meta = commandStatusMeta[command.status] ?? commandStatusMeta.cancelled;
  const isFailed = command.status === 'failed';
  const isPending = command.status === 'pending';
  const isOpen = command.action === 'open';

  let actorLabel = 'Operador (Carlos Gómez)';
  if (command.requested_by && currentUserId && command.requested_by === currentUserId) {
    actorLabel = currentUserEmail ? `Productor (${currentUserEmail})` : 'Productor';
  }

  return (
    <View style={timelineStyles.itemRow}>
      <View style={timelineStyles.gutter}>
        <View
          style={[
            timelineStyles.line,
            isFirst && timelineStyles.lineFirst,
            isLast && timelineStyles.lineLast,
          ]}
        />
        <View style={[timelineStyles.node, { borderColor: meta.nodeBorder, backgroundColor: meta.nodeBg }]}>
          <Ionicons name={meta.nodeIcon} size={14} color={meta.nodeBorder} />
        </View>
      </View>

      <View style={timelineStyles.card}>
        <View style={timelineStyles.cardHeader}>
          <Text style={[timelineStyles.actionTitle, { color: meta.actionColor }]}>
            {isOpen ? 'ABRIR VÁLVULA' : 'CERRAR VÁLVULA'}
          </Text>
          <View style={[timelineStyles.badge, { backgroundColor: meta.badgeBg, borderColor: meta.badgeBorder }]}>
            <Ionicons name={meta.badgeIcon} size={11} color={meta.badgeColor} />
            <Text style={[timelineStyles.badgeText, { color: meta.badgeColor }]}>{meta.label}</Text>
          </View>
        </View>

        <Text style={timelineStyles.targetText}>
          {valveName} ({plotName})
        </Text>

        <View style={timelineStyles.metricsRow}>
          <View style={timelineStyles.metricItem}>
            <Ionicons name="time-outline" size={13} color="#86948a" />
            <Text style={timelineStyles.metricText}>
              {formatCommandDate(command.applied_at ?? command.created_at)}
            </Text>
          </View>
          {isOpen && command.duration_minutes > 0 && (
            <View style={timelineStyles.metricItem}>
              <Ionicons name="timer-outline" size={13} color="#86948a" />
              <Text style={timelineStyles.metricText}>
                Duración: {command.duration_minutes} min
              </Text>
            </View>
          )}
        </View>

        <View style={timelineStyles.actorRow}>
          <Ionicons name="person-outline" size={13} color="#86948a" />
          <Text style={timelineStyles.actorText}>Actor: {actorLabel}</Text>
        </View>

        {isFailed && (
          <View style={timelineStyles.failedBanner}>
            <Ionicons name="warning-outline" size={14} color="#ef4444" />
            <Text style={timelineStyles.failedText}>Fallo al aplicar comando</Text>
          </View>
        )}

        {isPending && canOperate && (
          <Pressable
            onPress={() => onCancel(command.id)}
            disabled={busy}
            style={[timelineStyles.cancelButton, busy && timelineStyles.buttonDisabled]}
          >
            {busy ? (
              <ActivityIndicator color="#ef4444" size="small" />
            ) : (
              <>
                <Ionicons name="close-circle-outline" size={13} color="#ef4444" />
                <Text style={timelineStyles.cancelButtonText}>Cancelar comando</Text>
              </>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

function MoistureChart({ data }: { data: ReturnType<typeof toMoistureChartData> }) {
  const scale = (value: number): `${number}%` => `${100 - ((value - data.min) / (data.max - data.min)) * 100}%`;
  return (
    <View style={styles.chart}>
      <View style={[styles.threshold, { top: scale(data.thresholdMax), borderTopColor: '#22c55e' }]} />
      <View style={[styles.threshold, { top: scale(data.thresholdMin), borderTopColor: '#ef4444' }]} />
      <View style={styles.axis}>
        <Text style={styles.axisText}>100%</Text>
        <Text style={styles.axisText}>50%</Text>
        <Text style={styles.axisText}>0%</Text>
      </View>
      <View style={styles.bars}>
        {data.points.map((point) => (
          <View key={`${point.measuredAt}-${point.x}`} style={styles.barSlot}>
            <View style={[styles.bar, { height: `${point.value}%`, backgroundColor: point.value < data.thresholdMin ? '#ef4444' : '#22c55e' }]} />
          </View>
        ))}
      </View>
      <View style={styles.xAxis}>
        <Text style={styles.axisText}>Hace 6h</Text>
        <Text style={styles.axisText}>Ahora</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0f1512' },
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  loader: { marginTop: 80 },
  backRow: { alignItems: 'center', flexDirection: 'row', gap: 4, marginBottom: 4 },
  back: { color: '#22c55e', fontSize: 14, fontWeight: '700' },
  headerSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  eyebrow: { color: '#22c55e', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: '#ffffff', fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginTop: 2 },
  crop: { color: '#86948a', fontSize: 14, marginTop: 2 },
  statusPill: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusDot: { borderRadius: 999, height: 6.5, width: 6.5 },
  statusText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  suggestionBanner: {
    alignItems: 'flex-start',
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderColor: 'rgba(34, 197, 94, 0.25)',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  suggestionTitle: { color: '#22c55e', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  suggestionText: { color: '#dee4df', fontSize: 13, fontWeight: '500', lineHeight: 18, marginTop: 2 },
  metrics: { flexDirection: 'row', gap: 10 },
  metric: {
    backgroundColor: '#171d1a',
    borderColor: '#1f2923',
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    padding: 14,
  },
  metricHeader: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  metricLabel: { color: '#86948a', fontSize: 11, fontWeight: '600' },
  metricValue: { color: '#ffffff', fontSize: 22, fontWeight: '800', letterSpacing: -0.5, marginTop: 4 },
  metricSub: { color: '#86948a', fontSize: 11, fontWeight: '500', marginTop: 2 },
  card: { backgroundColor: '#171d1a', borderColor: '#1f2923', borderRadius: 18, borderWidth: 1, padding: 16, gap: 10 },
  cardHeaderRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  sectionTitle: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  caption: { color: '#86948a', fontSize: 12 },
  chart: {
    backgroundColor: '#0f1512',
    borderColor: '#252b28',
    borderRadius: 14,
    borderWidth: 1,
    height: 180,
    marginTop: 6,
    paddingLeft: 34,
    paddingRight: 8,
    paddingBottom: 22,
    paddingTop: 10,
    position: 'relative',
  },
  axis: { bottom: 22, justifyContent: 'space-between', left: 8, position: 'absolute', top: 10 },
  axisText: { color: '#52695c', fontSize: 10 },
  bars: {
    alignItems: 'flex-end',
    borderBottomColor: '#252b28',
    borderBottomWidth: 1,
    borderLeftColor: '#252b28',
    borderLeftWidth: 1,
    bottom: 22,
    flexDirection: 'row',
    gap: 3,
    left: 36,
    position: 'absolute',
    right: 8,
    top: 10,
  },
  barSlot: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { borderRadius: 2, minHeight: 3, width: '100%' },
  threshold: { borderTopWidth: 1, borderStyle: 'dashed', left: 36, position: 'absolute', right: 8, zIndex: 2 },
  xAxis: { bottom: 4, flexDirection: 'row', justifyContent: 'space-between', left: 36, position: 'absolute', right: 8 },
  empty: { backgroundColor: '#171d1a', borderColor: '#1f2923', borderRadius: 18, borderWidth: 1, padding: 18 },
  cardTitle: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  body: { color: '#86948a', fontSize: 14, lineHeight: 20, marginTop: 6 },
  retry: { alignSelf: 'flex-start', backgroundColor: '#22c55e', borderRadius: 10, marginTop: 12, paddingHorizontal: 14, paddingVertical: 8 },
  retryText: { color: '#003824', fontWeight: '800' },
  inputGroup: { marginTop: 4 },
  inputLabel: { color: '#86948a', fontSize: 12, fontWeight: '700' },
  input: {
    backgroundColor: '#0f1512',
    borderColor: '#252b28',
    borderRadius: 12,
    borderWidth: 1,
    color: '#dee4df',
    fontSize: 15,
    marginTop: 6,
    padding: 12,
  },
  validationError: { color: '#ef4444', fontSize: 12, minHeight: 16, marginTop: 3 },
  saveButton: { alignItems: 'center', backgroundColor: '#22c55e', borderRadius: 12, marginTop: 6, padding: 12 },
  saveButtonDisabled: { opacity: 0.45 },
  saveButtonText: { color: '#003824', fontSize: 14, fontWeight: '800' },
  success: { color: '#22c55e', fontSize: 13, fontWeight: '700', marginTop: 8 },
  error: { color: '#ef4444', fontSize: 14, lineHeight: 20 },
  infoRow: {
    borderBottomColor: '#252b28',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  infoLabel: { color: '#86948a', fontSize: 13 },
  infoValue: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  footer: { color: '#6b7280', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 8 },
  manualReadingButton: {
    alignItems: 'center',
    backgroundColor: '#171d1a',
    borderColor: '#1f2923',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    padding: 14,
  },
  manualReadingText: { color: '#22c55e', fontSize: 14, fontWeight: '800' },
  stationChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 10,
  },
  stationChip: {
    alignItems: 'center',
    backgroundColor: '#0f1512',
    borderColor: '#252b28',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  stationChipSelected: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  stationChipText: {
    color: '#dee4df',
    fontSize: 12,
    fontWeight: '700',
  },
  stationChipTextSelected: {
    color: '#003824',
    fontWeight: '800',
  },
});

const irrigationStyles = StyleSheet.create({
  bodyDark: { color: '#86948a', fontSize: 13, marginTop: 6 },
  commandMessage: { color: '#22c55e', fontSize: 13, fontWeight: '700', marginTop: 10 },
  validationError: { color: '#ef4444', fontSize: 12, marginTop: 4 },
  valveRow: { borderTopColor: '#252b28', borderTopWidth: 1, marginTop: 10, paddingTop: 10, gap: 8 },
  valveHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  valveTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  valveIndicator: { width: 8, height: 8, borderRadius: 4 },
  valveName: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  valveState: { fontSize: 12, fontWeight: '800' },
  durationInput: {
    backgroundColor: '#0f1512',
    borderColor: '#252b28',
    borderRadius: 10,
    borderWidth: 1,
    color: '#dee4df',
    padding: 10,
    fontSize: 14,
  },
  commandButtons: { flexDirection: 'row', gap: 8, marginTop: 4 },
  commandButton: { borderRadius: 10, flex: 1, padding: 11, alignItems: 'center' },
  openButton: { backgroundColor: '#22c55e' },
  openButtonText: { color: '#003824', fontWeight: '800', fontSize: 13 },
  closeButton: { backgroundColor: '#0f1512', borderColor: '#252b28', borderWidth: 1 },
  closeButtonText: { color: '#dee4df', fontWeight: '700', fontSize: 13 },
  commandButtonDisabled: { opacity: 0.4 },
  pendingRow: { alignItems: 'center', flexDirection: 'row', gap: 10, marginTop: 6 },
  pendingHint: { color: '#f59e0b', flex: 1, fontSize: 12 },
  cancelButton: { backgroundColor: 'rgba(239, 68, 68, 0.2)', borderColor: 'rgba(239, 68, 68, 0.4)', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  cancelButtonText: { color: '#ef4444', fontSize: 12, fontWeight: '800' },
  commandRow: { borderTopColor: '#252b28', borderTopWidth: 1, marginTop: 10, paddingTop: 10, gap: 4 },
  commandRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  commandName: { color: '#ffffff', flex: 1, fontSize: 13, fontWeight: '700' },
  statusBadge: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2 },
  commandStatus: { fontSize: 10, fontWeight: '800' },
  commandDetails: { color: '#86948a', fontSize: 11 },
});

const timelineStyles = StyleSheet.create({
  section: {
    marginTop: 6,
    gap: 12,
  },
  header: {
    gap: 4,
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subtitle: {
    color: '#86948a',
    fontSize: 13,
    lineHeight: 18,
  },
  list: {
    gap: 14,
    marginTop: 4,
  },
  itemRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gutter: {
    width: 28,
    alignItems: 'center',
    position: 'relative',
  },
  line: {
    position: 'absolute',
    top: 0,
    bottom: -14,
    width: 2,
    backgroundColor: '#1c2820',
  },
  lineFirst: {
    top: 22,
  },
  lineLast: {
    bottom: 'auto',
    height: 22,
  },
  node: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    zIndex: 2,
  },
  card: {
    flex: 1,
    backgroundColor: '#171d1a',
    borderColor: '#1f2923',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  targetText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    columnGap: 14,
    rowGap: 4,
    marginTop: 2,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metricText: {
    color: '#86948a',
    fontSize: 12,
    fontWeight: '500',
  },
  actorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  actorText: {
    color: '#86948a',
    fontSize: 12,
    fontWeight: '500',
  },
  failedBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 4,
  },
  failedText: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 4,
  },
  cancelButtonText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '800',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#171d1a',
    borderColor: '#1f2923',
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    gap: 8,
  },
  emptyText: {
    color: '#86948a',
    fontSize: 13,
    textAlign: 'center',
  },
});


