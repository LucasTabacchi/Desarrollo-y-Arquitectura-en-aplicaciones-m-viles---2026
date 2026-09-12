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
type IrrigationCommand = { id: string; valve_id: string; action: 'open' | 'close'; duration_minutes: number; status: CommandStatus; client_request_id: string; created_at: string; applied_at: string | null };
type Plot = { id: string; name: string; crop: string | null; threshold_min: number; threshold_max: number; stations: { id: string; name: string; external_id: string | null; readings: Reading[]; weather_readings: WeatherReading[] }[]; valves: Valve[] };
type MembershipRole = 'producer' | 'operator' | 'advisor';
const statusMeta: Record<PlotStatus, { label: string; color: string }> = {
  stale: { label: 'Sin datos', color: '#94a3b8' },
  dry: { label: 'Seco', color: '#f87171' },
  optimal: { label: 'Óptimo', color: '#4ade80' },
  wet: { label: 'Húmedo', color: '#38bdf8' },
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
          const commandResult = await supabase.from('irrigation_commands').select('id, valve_id, action, duration_minutes, status, client_request_id, created_at, applied_at').in('valve_id', valveIds).order('created_at', { ascending: false }).limit(20);
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

  const station = plot?.stations[0] ?? null;
  const stationId = station?.id;
  useEffect(() => {
    if (!isUuid(plotId) || !isUuid(stationId)) return;
    let active = true;
    const channel = supabase.channel(`plot-telemetry-${plotId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'readings', filter: `station_id=eq.${stationId}` }, () => { if (active) void loadPlot(true); }).on('postgres_changes', { event: '*', schema: 'public', table: 'weather_readings', filter: `station_id=eq.${stationId}` }, () => { if (active) void loadPlot(true); }).subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [loadPlot, plotId, stationId]);

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
    const duration = validateCommandDuration(durations[valve.id] ?? '');
    if (!duration.valid || duration.value === null) { setCommandMessage(duration.error); return; }
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
        durationMinutes: String(duration.value),
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

  if (isLoading) return <Screen><ActivityIndicator color="#d9e878" size="large" style={styles.loader} /></Screen>;
  return <Screen refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadPlot(true)} tintColor="#d9e878" />}>
    <Pressable accessibilityRole="button" onPress={() => router.back()}><Text style={styles.back}>‹ Volver a lotes</Text></Pressable>
    {error && !plot ? <View style={styles.empty}><Text style={styles.title}>Telemetría no disponible</Text><Text accessibilityLiveRegion="polite" style={styles.body}>{error}</Text><Pressable onPress={() => void loadPlot(true)} style={styles.retry}><Text style={styles.retryText}>Reintentar</Text></Pressable></View> : plot && <>
      <Text style={styles.eyebrow}>DETALLE DE LOTE / TELEMETRÍA</Text><Text style={styles.title}>{plot.name}</Text><Text style={styles.crop}>{plot.crop ?? 'Sin cultivo especificado'}</Text>
      <View style={[styles.statusPill, { backgroundColor: statusMeta[status].color }]}><Text style={styles.statusText}>{statusMeta[status].label}</Text></View>

      {/* RF-22: Agronomic suggestion */}
      {suggestion && <View style={styles.suggestionBanner}><Ionicons name="bulb-outline" color="#c78932" size={18} /><Text style={styles.suggestionText}>{suggestion}</Text></View>}

      <View style={styles.metrics}><Metric label="Humedad del suelo" value={latest ? `${latest.soil_moisture_pct}%` : 'No disponible'} /><Metric label="Temperatura del aire" value={latest?.air_temperature_c != null ? `${latest.air_temperature_c}°C` : 'No disponible'} /><Metric label="Antigüedad de lectura" value={formatReadingAge(latest?.measured_at ?? null)} /></View>
      <View style={styles.card}><Text style={styles.sectionTitle}>Humedad / últimas 6 horas</Text><Text style={styles.caption}>{station ? `${station.name} · ${readings.length} lecturas` : 'Sin estación asignada'}</Text>{chart && <MoistureChart data={chart} />}</View>
      {!readings.length && <View style={styles.empty}><Text style={styles.cardTitle}>Sin lecturas aún</Text><Text style={styles.body}>La estación no ha reportado una lectura válida en las últimas seis horas.</Text></View>}
      <View style={styles.card}><Text style={styles.sectionTitle}>Umbrales de humedad de suelo</Text>{canEditThresholds ? <>
        <ThresholdInput label="Mínimo" value={minimumInput} onChangeText={setMinimumInput} error={validation.minimumError} />
        <ThresholdInput label="Máximo" value={maximumInput} onChangeText={setMaximumInput} error={validation.maximumError} />
        {validation.rangeError && <Text accessibilityLiveRegion="polite" style={styles.validationError}>{validation.rangeError}</Text>}
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: !validation.valid || isSaving }} disabled={!validation.valid || isSaving} onPress={() => void saveThresholds()} style={[styles.saveButton, (!validation.valid || isSaving) && styles.saveButtonDisabled]}><Text style={styles.saveButtonText}>{isSaving ? 'Guardando…' : 'Guardar cambios'}</Text></Pressable>
        {saveMessage && <Text accessibilityLiveRegion="polite" style={styles.success}>{saveMessage}</Text>}
      </> : <InfoRow label="Rango actual" value={`${plot.threshold_min}% – ${plot.threshold_max}%`} />}</View>
      {error && <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
       <View style={styles.card}><InfoRow label="Estación" value={station?.name ?? 'Sin estación'} /><InfoRow label="Última precipitación" value={rainfall ? `${rainfall.rainfall_mm} mm · ${formatReadingAge(rainfall.measured_at)}` : 'Sin datos climáticos'} /></View>

      {/* RF-21: Manual reading button */}
      {canEditThresholds && station && <Pressable onPress={() => router.push({ pathname: '/manual-reading' as any, params: { stationId: station.id, plotName: plot.name } })} style={styles.manualReadingButton}><Ionicons name="create-outline" color="#10251d" size={18} /><Text style={styles.manualReadingText}>Cargar lectura manual</Text></Pressable>}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Válvulas de riego</Text>
        <Text style={styles.caption}>{canEditThresholds ? 'Los comandos son aplicados por el worker de riego en segundo plano.' : 'Acceso de solo lectura: controles de comando deshabilitados.'}</Text>
        {!plot.valves.length && <Text style={irrigationStyles.bodyDark}>No hay válvulas asignadas a este lote.</Text>}
        {plot.valves.map((valve) => <ValveCard key={valve.id} valve={valve} commands={commands} duration={durations[valve.id] ?? ''} canOperate={canEditThresholds} busy={commandBusy === valve.id} onDurationChange={(value) => setDurations((current) => ({ ...current, [valve.id]: value }))} onCommand={(action) => navigateToConfirm(valve, action)} onCancel={(commandId) => void cancelCommand(commandId)} />)}
        {commandMessage && <Text accessibilityLiveRegion="polite" style={irrigationStyles.commandMessage}>{commandMessage}</Text>}
      </View>
      <View style={styles.card}><Text style={styles.sectionTitle}>Historial de comandos</Text><Text style={styles.caption}>Últimos 20 comandos</Text>{commands.length ? commands.map((command) => <CommandRow key={command.id} command={command} valveName={plot.valves.find((valve) => valve.id === command.valve_id)?.name ?? 'Válvula'} />) : <Text style={irrigationStyles.bodyDark}>Sin comandos de riego registrados para este lote.</Text>}</View>
      <Text style={styles.footer}>Las lecturas en vivo se actualizan automáticamente. Deslizá hacia abajo para refrescar.</Text>
    </>}
  </Screen>;
}

function ThresholdInput({ label, value, onChangeText, error }: { label: string; value: string; onChangeText: (value: string) => void; error: string | null }) { return <View style={styles.inputGroup}><Text style={styles.inputLabel}>{label} (%)</Text><TextInput accessibilityLabel={`Porcentaje de umbral de humedad ${label}`} accessibilityHint="Ingresá un número de 0 a 100" keyboardType="decimal-pad" value={value} onChangeText={onChangeText} style={styles.input} /><Text accessibilityLiveRegion="polite" style={styles.validationError}>{error ?? ' '}</Text></View>; }
function Screen({ children, refreshControl }: { children: React.ReactNode; refreshControl?: React.ReactElement<React.ComponentProps<typeof RefreshControl>> }) { return <SafeAreaView style={styles.screen}><ScrollView refreshControl={refreshControl} contentContainerStyle={styles.content}>{children}</ScrollView></SafeAreaView>; }
function Metric({ label, value }: { label: string; value: string }) { return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text></View>; }
function InfoRow({ label, value }: { label: string; value: string }) { return <View style={styles.infoRow}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>; }
function ValveCard({ valve, commands, duration, canOperate, busy, onDurationChange, onCommand, onCancel }: { valve: Valve; commands: IrrigationCommand[]; duration: string; canOperate: boolean; busy: boolean; onDurationChange: (value: string) => void; onCommand: (action: 'open' | 'close') => void; onCancel: (commandId: string) => void }) {
  const pendingCommand = commands.find((command) => command.valve_id === valve.id && command.status === 'pending');
  const durationValidation = validateCommandDuration(duration);
  const stateLabel = valve.state === 'open' ? 'Abierta' : 'Cerrada';
  return <View style={irrigationStyles.valveRow}><View style={irrigationStyles.valveHeader}><Text style={irrigationStyles.valveName}>{valve.name}</Text><Text style={[irrigationStyles.valveState, { color: valve.state === 'open' ? '#4ade80' : '#8fa597' }]}>{stateLabel}</Text></View>{canOperate && <><TextInput accessibilityLabel={`Duración de comando para ${valve.name} en minutos`} accessibilityHint="Ingresá un entero de 1 a 120 minutos" keyboardType="number-pad" placeholder="Duración en minutos" placeholderTextColor="#718078" value={duration} onChangeText={onDurationChange} style={irrigationStyles.durationInput} />{duration.length > 0 && <Text style={irrigationStyles.validationError}>{durationValidation.error}</Text>}<View style={irrigationStyles.commandButtons}><Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || Boolean(pendingCommand) || !durationValidation.valid }} disabled={busy || Boolean(pendingCommand) || !durationValidation.valid} onPress={() => onCommand('open')} style={[irrigationStyles.commandButton, irrigationStyles.openButton, (busy || Boolean(pendingCommand) || !durationValidation.valid) && irrigationStyles.commandButtonDisabled]}><Text style={irrigationStyles.commandButtonText}>Abrir</Text></Pressable><Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || Boolean(pendingCommand) || !durationValidation.valid }} disabled={busy || Boolean(pendingCommand) || !durationValidation.valid} onPress={() => onCommand('close')} style={[irrigationStyles.commandButton, irrigationStyles.closeButton, (busy || Boolean(pendingCommand) || !durationValidation.valid) && irrigationStyles.commandButtonDisabled]}><Text style={irrigationStyles.commandButtonText}>Cerrar</Text></Pressable></View>{pendingCommand && <View style={irrigationStyles.pendingRow}><Text style={irrigationStyles.pendingHint}>Comando pendiente para esta válvula.</Text><Pressable onPress={() => onCancel(pendingCommand.id)} disabled={busy} style={[irrigationStyles.cancelButton, busy && irrigationStyles.commandButtonDisabled]}>{busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={irrigationStyles.cancelButtonText}>Cancelar</Text>}</Pressable></View>}</>}</View>;
}
function CommandRow({ command, valveName }: { command: IrrigationCommand; valveName: string }) { const meta = describeCommandStatus(command.status); const timestamp = new Date(command.applied_at ?? command.created_at); return <View style={irrigationStyles.commandRow}><View style={irrigationStyles.commandRowTop}><Text style={irrigationStyles.commandName}>{valveName} · {command.action === 'open' ? 'Abrir' : 'Cerrar'}</Text><Text style={[irrigationStyles.commandStatus, { color: meta.color }]}>{meta.label}</Text></View><Text style={irrigationStyles.commandDetails}>{command.duration_minutes} min · {Number.isFinite(timestamp.getTime()) ? timestamp.toLocaleString() : 'Hora no disponible'}</Text></View>; }
function MoistureChart({ data }: { data: ReturnType<typeof toMoistureChartData> }) { const scale = (value: number): `${number}%` => `${100 - ((value - data.min) / (data.max - data.min)) * 100}%`; return <View style={styles.chart}><View style={[styles.threshold, { top: scale(data.thresholdMax) }]} /><View style={[styles.threshold, { top: scale(data.thresholdMin) }]} /><View style={styles.axis}><Text style={styles.axisText}>100%</Text><Text style={styles.axisText}>50%</Text><Text style={styles.axisText}>0%</Text></View><View style={styles.bars}>{data.points.map((point) => <View key={`${point.measuredAt}-${point.x}`} style={styles.barSlot}><View style={[styles.bar, { height: `${point.value}%` }]} /></View>)}</View><View style={styles.xAxis}><Text style={styles.axisText}>Hace 6h</Text><Text style={styles.axisText}>Ahora</Text></View></View>; }

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: '#10251d' }, content: { padding: 24, gap: 16, paddingBottom: 40 }, loader: { marginTop: 80 }, back: { color: '#d9e878', fontSize: 15, fontWeight: '700', marginBottom: 10 }, eyebrow: { color: '#a9bd78', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 }, title: { color: '#f4f0e6', fontSize: 32, fontWeight: '800', marginTop: 4 }, crop: { color: '#a8b7ae', fontSize: 15 }, statusPill: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 }, statusText: { color: '#fff', fontSize: 13, fontWeight: '800' }, suggestionBanner: { alignItems: 'center', backgroundColor: 'rgba(199,137,50,0.15)', borderColor: 'rgba(199,137,50,0.3)', borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 10, padding: 14 }, suggestionText: { color: '#e8c06a', flex: 1, fontSize: 13, fontWeight: '700', lineHeight: 19 }, metrics: { flexDirection: 'row', gap: 8 }, metric: { backgroundColor: '#1c382c', borderRadius: 14, flex: 1, padding: 12 }, metricLabel: { color: '#a8b7ae', fontSize: 11 }, metricValue: { color: '#f4f0e6', fontSize: 18, fontWeight: '800', marginTop: 5 }, card: { backgroundColor: '#1c382c', borderColor: '#2d5040', borderRadius: 18, borderWidth: 1, padding: 16 }, sectionTitle: { color: '#f4f0e6', fontSize: 18, fontWeight: '800' }, caption: { color: '#a8b7ae', fontSize: 13, marginTop: 4 }, chart: { height: 190, marginTop: 18, paddingLeft: 34, paddingBottom: 20, position: 'relative' }, axis: { bottom: 20, justifyContent: 'space-between', left: 0, position: 'absolute', top: 0 }, axisText: { color: '#8a9b91', fontSize: 10 }, bars: { alignItems: 'flex-end', borderBottomColor: '#365345', borderBottomWidth: 1, borderLeftColor: '#365345', borderLeftWidth: 1, bottom: 20, flexDirection: 'row', gap: 3, left: 34, position: 'absolute', right: 0, top: 0 }, barSlot: { flex: 1, height: '100%', justifyContent: 'flex-end' }, bar: { backgroundColor: '#6abf78', minHeight: 3, width: '100%' }, threshold: { borderTopColor: '#d65c4a', borderTopWidth: 1, left: 34, position: 'absolute', right: 0, zIndex: 2 }, xAxis: { bottom: 0, flexDirection: 'row', justifyContent: 'space-between', left: 34, position: 'absolute', right: 0 }, empty: { backgroundColor: '#1c382c', borderColor: '#365345', borderRadius: 18, borderWidth: 1, padding: 18 }, cardTitle: { color: '#f4f0e6', fontSize: 18, fontWeight: '800' }, body: { color: '#b5c0b9', fontSize: 15, lineHeight: 22, marginTop: 8 }, retry: { alignSelf: 'flex-start', backgroundColor: '#d9e878', borderRadius: 10, marginTop: 14, paddingHorizontal: 14, paddingVertical: 10 }, retryText: { color: '#10251d', fontWeight: '800' }, inputGroup: { marginTop: 14 }, inputLabel: { color: '#a8b7ae', fontSize: 13, fontWeight: '700' }, input: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: '#365345', borderRadius: 10, borderWidth: 1, color: '#f4f0e6', fontSize: 17, marginTop: 6, padding: 11 }, validationError: { color: '#ff8a7a', fontSize: 13, minHeight: 18, marginTop: 4 }, saveButton: { alignItems: 'center', backgroundColor: '#d9e878', borderRadius: 10, marginTop: 8, padding: 13 }, saveButtonDisabled: { opacity: 0.45 }, saveButtonText: { color: '#10251d', fontSize: 15, fontWeight: '800' }, success: { color: '#6abf78', fontSize: 13, fontWeight: '700', marginTop: 10 }, error: { color: '#ffb4aa', fontSize: 15, lineHeight: 22 }, infoRow: { borderBottomColor: '#2d5040', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9 }, infoLabel: { color: '#8a9b91', fontSize: 13 }, infoValue: { color: '#f4f0e6', fontSize: 14, fontWeight: '700' }, footer: { color: '#718078', fontSize: 12, lineHeight: 18 }, manualReadingButton: { alignItems: 'center', backgroundColor: '#173827', borderColor: '#315340', borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 8, justifyContent: 'center', padding: 14 }, manualReadingText: { color: '#d9e878', fontSize: 14, fontWeight: '800' } });

const irrigationStyles = StyleSheet.create({
  bodyDark: { color: '#a8b7ae', fontSize: 14, marginTop: 12 }, commandMessage: { color: '#6abf78', fontSize: 13, fontWeight: '700', marginTop: 14 }, validationError: { color: '#ff8a7a', fontSize: 12, marginTop: 4 },
  valveRow: { borderTopColor: '#2d5040', borderTopWidth: 1, marginTop: 14, paddingTop: 14 }, valveHeader: { flexDirection: 'row', justifyContent: 'space-between' }, valveName: { color: '#f4f0e6', fontSize: 15, fontWeight: '800' }, valveState: { fontSize: 15, fontWeight: '800' }, durationInput: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: '#365345', borderRadius: 10, borderWidth: 1, color: '#f4f0e6', marginTop: 10, padding: 10 }, commandButtons: { flexDirection: 'row', gap: 8, marginTop: 8 }, commandButton: { borderRadius: 9, flex: 1, padding: 11 }, openButton: { backgroundColor: '#367d46' }, closeButton: { backgroundColor: '#234233', borderColor: '#365345', borderWidth: 1 }, commandButtonDisabled: { opacity: 0.4 }, commandButtonText: { color: '#fff', fontWeight: '800', textAlign: 'center' }, pendingRow: { alignItems: 'center', flexDirection: 'row', gap: 10, marginTop: 8 }, pendingHint: { color: '#e8c06a', flex: 1, fontSize: 12 }, cancelButton: { backgroundColor: '#b04438', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 }, cancelButtonText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  commandRow: { borderTopColor: '#2d5040', borderTopWidth: 1, marginTop: 12, paddingTop: 12 }, commandRowTop: { flexDirection: 'row', justifyContent: 'space-between' }, commandName: { color: '#f4f0e6', flex: 1, fontSize: 14, fontWeight: '700' }, commandStatus: { fontSize: 13, fontWeight: '800' }, commandDetails: { color: '#8a9b91', fontSize: 12, marginTop: 4 },
});
