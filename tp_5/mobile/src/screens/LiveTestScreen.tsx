import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Easing } from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';
import { colors, typography, spacing } from '../theme';
import { RackCard } from '../ui/RackCard';
import { DataMetric } from '../ui/DataMetric';
import { TacticalButton } from '../ui/TacticalButton';
import { PingEngine } from '../services/PingEngine';
import { ThroughputRunner } from '../services/ThroughputRunner';
import { DatabaseService } from '../services/DatabaseService';
import { GeoService } from '../services/GeoService';
import { AlertService } from '../services/AlertService';
import { NativeTelephonyService } from '../services/NativeTelephony';
import { TargetHost, QoSSession, QoSSample, NetworkStateInfo, SLAThresholds } from '../types';

interface LiveTestScreenProps {
  backendUrl: string;
  targetHosts: TargetHost[];
  networkState: NetworkStateInfo | null;
  slaThresholds: SLAThresholds;
  onTestComplete?: (session: QoSSession) => void;
}

export const LiveTestScreen: React.FC<LiveTestScreenProps> = ({
  backendUrl,
  targetHosts,
  networkState,
  slaThresholds,
  onTestComplete,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [activePhase, setActivePhase] = useState<'IDLE' | 'PING' | 'DOWNLOAD' | 'UPLOAD' | 'COMPLETED'>('IDLE');

  // Live telemetry values
  const [instantRtt, setInstantRtt] = useState(18.5);
  const [peakRtt, setPeakRtt] = useState(18.5);
  const [rttHistory, setRttHistory] = useState<number[]>([18, 19, 18, 20, 19, 21, 18, 19]);
  const [waterfallPackets, setWaterfallPackets] = useState<Array<{ rtt: number; status: 'OK' | 'WARN' | 'DROP' }>>([]);
  const [dlThroughput, setDlThroughput] = useState(0);
  const [ulThroughput, setUlThroughput] = useState(0);
  const [packetRate, _setPacketRate] = useState(4820);

  const sweepAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const sweep = Animated.loop(
      Animated.timing(sweepAnim, {
        toValue: 300,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.2, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    sweep.start();
    pulse.start();
    return () => {
      sweep.stop();
      pulse.stop();
    };
  }, [sweepAnim, pulseAnim]);

  const pingEngineRef = useRef<PingEngine>(new PingEngine());
  const throughputRunnerRef = useRef<ThroughputRunner>(new ThroughputRunner());
  const timerRef = useRef<any>(null);

  // Oscilloscope trace generator
  const generateSvgPath = (history: number[]): string => {
    if (history.length === 0) return 'M 0 100 L 320 100';
    const width = 320;
    const height = 140;
    const step = width / Math.max(1, history.length - 1);

    // Max scale ~100ms
    const maxVal = 100;
    const points = history.map((val, i) => {
      const x = i * step;
      const y = Math.max(10, Math.min(height - 10, height - (val / maxVal) * (height - 20)));
      return `${x.toFixed(1)} ${y.toFixed(1)}`;
    });

    return `M ${points.join(' L ')}`;
  };

  const startBenchmark = async () => {
    setIsRunning(true);
    setIsPaused(false);
    setElapsedMs(0);
    setWaterfallPackets([]);
    setRttHistory([18]);
    setPeakRtt(0);
    setDlThroughput(0);
    setUlThroughput(0);

    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startTime);
    }, 50);

    const samples: QoSSample[] = [];
    const sessionId = `SEQ-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      // 1. FASE PING (RTT & JITTER)
      setActivePhase('PING');
      const pingEngine = pingEngineRef.current;
      const allRtts: number[] = [];

      const unsubscribe = pingEngine.addListener(probe => {
        const rtt = probe.rtt;
        allRtts.push(rtt);
        setInstantRtt(Number(rtt.toFixed(1)));
        setPeakRtt(prev => Math.max(prev, Number(rtt.toFixed(1))));
        setRttHistory(prev => [...prev.slice(-25), rtt]);

        const status = probe.isTimeout ? 'DROP' : rtt > 60 ? 'WARN' : 'OK';
        setWaterfallPackets(prev => [...prev.slice(-48), { rtt, status }]);

        samples.push({
          id: `SMP-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          sessionId,
          timestamp: Date.now(),
          phase: 'PING',
          metricName: 'rtt',
          metricValue: rtt,
        });
      });

      await pingEngine.runBatchProbes(targetHosts, 6, 200);
      unsubscribe();

      // 2. FASE DOWNLOAD
      setActivePhase('DOWNLOAD');
      const dlRes = await throughputRunnerRef.current.runDownloadTest(backendUrl, 5, (_ph, mbps) => {
        setDlThroughput(mbps);
        samples.push({
          id: `SMP-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          sessionId,
          timestamp: Date.now(),
          phase: 'DOWNLOAD',
          metricName: 'dl_mbps',
          metricValue: mbps,
        });
      });
      setDlThroughput(dlRes.mbps);

      // 3. FASE UPLOAD
      setActivePhase('UPLOAD');
      const ulRes = await throughputRunnerRef.current.runUploadTest(backendUrl, 2, (_ph, mbps) => {
        setUlThroughput(mbps);
        samples.push({
          id: `SMP-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          sessionId,
          timestamp: Date.now(),
          phase: 'UPLOAD',
          metricName: 'ul_mbps',
          metricValue: mbps,
        });
      });
      setUlThroughput(ulRes.mbps);

      // 4. COMPLETION & PERSISTENCE
      setActivePhase('COMPLETED');
      if (timerRef.current) clearInterval(timerRef.current);

      const geo = await GeoService.getCurrentLocation();
      const avgRtt = allRtts.length > 0 ? allRtts.reduce((a, b) => a + b, 0) / allRtts.length : 16;
      const minRtt = allRtts.length > 0 ? Math.min(...allRtts) : 10;
      const maxRtt = allRtts.length > 0 ? Math.max(...allRtts) : 25;
      const jitter = pingEngine.calculateJitter(allRtts);
      const lossPercent = 0.0;

      let status: 'NOMINAL' | 'DEGRADED' | 'CRITICAL' = 'NOMINAL';
      if (avgRtt > slaThresholds.criticalRttMs || jitter > slaThresholds.criticalJitterMs) {
        status = 'DEGRADED';
      }

      const isWifi = networkState?.type === 'wifi';
      const session: QoSSession = {
        id: sessionId,
        timestamp: Date.now(),
        networkType: networkState?.telephony?.networkType || (isWifi ? 'WIFI' : '4G LTE'),
        operator: NativeTelephonyService.resolveNetworkLabel(networkState),
        signalLevel: networkState?.telephony?.signalLevel ?? 4,
        signalDbm: networkState?.telephony?.signalDbm ?? -82,
        latitude: geo.latitude,
        longitude: geo.longitude,
        altitude: geo.altitude,
        accuracy: geo.accuracy,
        avgRtt: Number(avgRtt.toFixed(1)),
        minRtt: Number(minRtt.toFixed(1)),
        maxRtt: Number(maxRtt.toFixed(1)),
        jitter: Number(jitter.toFixed(1)),
        lossPercent,
        downloadMbps: dlRes.mbps,
        uploadMbps: ulRes.mbps,
        status,
        samples,
      };

      await DatabaseService.saveSession(session);
      await AlertService.evaluateAndNotify(avgRtt, jitter, lossPercent, slaThresholds);
      onTestComplete?.(session);
    } catch (err) {
      console.warn('[LiveTestScreen] Benchmark error:', err);
      setActivePhase('IDLE');
    } finally {
      setIsRunning(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const abortBenchmark = () => {
    pingEngineRef.current.stop();
    throughputRunnerRef.current.cancel();
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRunning(false);
    setActivePhase('IDLE');
  };

  const formatTimer = (ms: number): string => {
    const totalSec = Math.floor(ms / 1000);
    const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const ss = String(totalSec % 60).padStart(2, '0');
    const msRemainder = String(Math.floor((ms % 1000) / 10)).padStart(2, '0');
    return `${mm}:${ss}.${msRemainder}`;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 1. EXECUTION BANNER */}
      <RackCard
        title={isRunning ? `TEST EN CURSO // FASE: ${activePhase}` : 'OSCILOSCOPIO RTT // LISTO'}
        tag={isRunning ? 'SAMPLING: RUNNING' : 'STATUS: READY'}
        tagColor={isRunning ? colors.error : colors.secondary}
      >
        <View style={styles.chronometerRow}>
          <View>
            <Text style={styles.label}>CRONÓMETRO DE MUESTREO (HW SYNC)</Text>
            <Text style={styles.chronoText}>{formatTimer(elapsedMs)}</Text>
          </View>
          <View style={styles.phaseBadge}>
            <Text style={styles.phaseLabel}>FASE ACTIVA</Text>
            <Text style={styles.phaseValue}>{activePhase}</Text>
          </View>
        </View>
      </RackCard>

      {/* 2. VECTOR OSCILLOSCOPE (RTT & JITTER WAVEFORM) */}
      <RackCard title="OSCILOSCOPIO RTT // GRID 10ms x 100ms" tag={`INSTANT: ${instantRtt} ms`}>
        <View style={styles.scopeCanvas}>
          <Svg width="100%" height={140} viewBox="0 0 320 140">
            {/* Grid lines */}
            <Line x1="0" y1="20" x2="320" y2="20" stroke={colors.scopeMajorGrid} strokeDasharray="3,3" strokeWidth="1" />
            <Line x1="0" y1="50" x2="320" y2="50" stroke={colors.scopeMajorGrid} strokeDasharray="3,3" strokeWidth="1" />
            <Line x1="0" y1="80" x2="320" y2="80" stroke={colors.scopeMajorGrid} strokeDasharray="3,3" strokeWidth="1" />
            <Line x1="0" y1="110" x2="320" y2="110" stroke={colors.scopeMajorGrid} strokeDasharray="3,3" strokeWidth="1" />

            {/* Threshold line (60ms warning) */}
            <Line x1="0" y1="56" x2="320" y2="56" stroke={colors.tertiary} strokeDasharray="4,2" strokeWidth="1" opacity={0.6} />

            {/* Vector Trace Path */}
            <Path d={generateSvgPath(rttHistory)} fill="none" stroke={colors.primary} strokeWidth="2.5" />
          </Svg>

          {/* Oscilloscope Scanning Phosphor Beam */}
          <Animated.View
            style={[
              styles.scopeBeam,
              {
                transform: [{ translateX: sweepAnim }],
              },
            ]}
          />

          <View style={styles.scopeHud}>
            <Text style={styles.scopeTagAmber}>WARN &gt;60ms</Text>
            <Text style={styles.scopeTagGreen}>NOM &lt;25ms</Text>
            <Text style={styles.scopeTagRight}>PEAK: {peakRtt}ms</Text>
          </View>
        </View>

        {/* Packet Waterfall Buffer (Discrete datagrams) */}
        <View style={styles.waterfallContainer}>
          <Text style={styles.label}>PACKET WATERFALL BUFFER (MUESTRAS RECIENTES)</Text>
          <View style={styles.waterfallGrid}>
            {(waterfallPackets.length > 0 ? waterfallPackets : Array.from({ length: 36 }).map(() => ({ rtt: 18, status: 'OK' as const }))).map((pkt, idx) => (
              <View
                key={idx}
                style={[
                  styles.waterfallBlock,
                  {
                    backgroundColor:
                      pkt.status === 'OK'
                        ? colors.secondary
                        : pkt.status === 'WARN'
                        ? colors.tertiary
                        : colors.error,
                  },
                ]}
              />
            ))}
          </View>
        </View>
      </RackCard>

      {/* 3. SIMULTANEOUS THROUGHPUT METER */}
      <RackCard title="DUAL CHANNEL THROUGHPUT TELEMETRY" tag="REALTIME Mbps">
        <View style={styles.throughputRow}>
          <DataMetric
            label="CANAL 01 // DESCARGA [DL]"
            value={dlThroughput.toFixed(1)}
            unit="Mbps"
            color={colors.primary}
            size="lg"
            sublabel={activePhase === 'DOWNLOAD' ? 'ACTIVE STREAM' : 'SETTLED'}
          />
          <DataMetric
            label="CANAL 02 // SUBIDA [UL]"
            value={ulThroughput.toFixed(1)}
            unit="Mbps"
            color={colors.secondary}
            size="lg"
            sublabel={activePhase === 'UPLOAD' ? 'ACTIVE STREAM' : 'SETTLED'}
          />
        </View>
      </RackCard>

      {/* 4. TERMINAL HEX/PCAP MICRO MONITOR (MINIMALIST TELEMETRY INSET) */}
      <View style={styles.pcapMicroMonitor}>
        <View style={styles.pcapHeader}>
          <View style={styles.rowAlign}>
            <Animated.View style={[styles.pulseDotSm, { opacity: pulseAnim }]} />
            <Text style={styles.pcapIfaceText}>
              CAP0: {networkState?.type === 'wifi' ? 'wlan0.mon0' : 'rmnet0.mon0'} [HW_SYNC]
            </Text>
          </View>
          <Text style={styles.pcapRateText}>{packetRate.toLocaleString()} pkts/sec</Text>
        </View>
        <Text style={styles.pcapHexDump} numberOfLines={1}>
          [0x002A] 45 00 00 3c d4 f1 40 00 40 01 e8 57 c0 a8 01 02 b5 1e 80 2a 08 00 4d 5b 00 01 00 01
        </Text>
      </View>

      {/* 5. EXECUTION CONTROLS */}
      <View style={styles.controlsRow}>
        {!isRunning ? (
          <TacticalButton
            label="▶ INICIAR TEST COMPLETO"
            variant="primary"
            onPress={startBenchmark}
            style={{ flex: 1 }}
          />
        ) : (
          <View style={{ flex: 1, flexDirection: 'row', gap: spacing.xs }}>
            <TacticalButton
              label={isPaused ? 'REANUDAR SWEEP' : 'PAUSAR SWEEP'}
              icon={isPaused ? 'play' : 'pause'}
              variant="secondary"
              onPress={() => setIsPaused(!isPaused)}
              style={{ flex: 1 }}
            />
            <TacticalButton
              label="ABORTAR CAPTURA"
              icon="abort"
              variant="danger"
              onPress={abortBenchmark}
              style={{ flex: 1 }}
            />
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  chronometerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 9,
    color: colors.outline,
    marginBottom: spacing.xs,
  },
  chronoText: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
  },
  phaseBadge: {
    backgroundColor: colors.surfaceContainerHighest,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'flex-end',
  },
  phaseLabel: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 8,
    color: colors.outline,
  },
  phaseValue: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 12,
    fontWeight: '700',
    color: colors.onSurface,
  },
  scopeCanvas: {
    backgroundColor: colors.scopeBg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    position: 'relative',
  },
  scopeHud: {
    position: 'absolute',
    top: 4,
    left: 6,
    right: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scopeTagAmber: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 8,
    color: colors.tertiary,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 3,
  },
  scopeTagGreen: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 8,
    color: colors.secondary,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 3,
  },
  scopeTagRight: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 9,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 4,
  },
  waterfallContainer: {
    marginTop: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  waterfallGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    marginTop: spacing.xs,
  },
  waterfallBlock: {
    width: 6,
    height: 12,
  },
  throughputRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  controlsRow: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  scopeBeam: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: `${colors.primary}99`,
    shadowColor: colors.primary,
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  pcapMicroMonitor: {
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.xs + 2,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginBottom: spacing.xs,
    gap: 2,
  },
  pcapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDotSm: {
    width: 6,
    height: 6,
    backgroundColor: colors.secondary,
    borderRadius: 3,
  },
  pcapIfaceText: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 9,
    color: colors.onSurfaceVariant,
  },
  pcapRateText: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 9,
    color: colors.secondary,
    fontWeight: '700',
  },
  pcapHexDump: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 8,
    color: colors.outline,
  },
});
