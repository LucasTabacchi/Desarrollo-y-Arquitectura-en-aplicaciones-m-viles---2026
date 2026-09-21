import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { colors } from './src/theme';
import { TopNavHeader } from './src/ui/TopNavHeader';
import { BottomTabBar, TabKey } from './src/ui/BottomTabBar';

import { DashboardScreen } from './src/screens/DashboardScreen';
import { LiveTestScreen } from './src/screens/LiveTestScreen';
import { CoverageMapScreen } from './src/screens/CoverageMapScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { SessionDetailScreen } from './src/screens/SessionDetailScreen';
import { ConfigScreen } from './src/screens/ConfigScreen';

import { NativeTelephonyService } from './src/services/NativeTelephony';
import { DatabaseService } from './src/services/DatabaseService';
import { GeoService } from './src/services/GeoService';
import { PingEngine } from './src/services/PingEngine';
import { AlertService } from './src/services/AlertService';
import { BackgroundMeasurementService } from './src/services/BackgroundMeasurementService';

import {
  AppConfig,
  NetworkStateInfo,
  AggregatedPingStats,
  GeoCoordinates,
  QoSSession,
} from './src/types';

const DEFAULT_CONFIG: AppConfig = {
  targetHosts: [
    { id: 'host-1', name: 'CF-EZE Anycast (Cloudflare)', host: '1.1.1.1', port: 80 },
    { id: 'host-2', name: 'Google Primary DNS', host: '8.8.8.8', port: 53 },
    { id: 'host-3', name: 'Quad9 Secure Resolver', host: '9.9.9.9', port: 53 },
  ],
  backendUrl: 'http://10.0.2.2:3000', // Standard Android emulator localhost bridge
  backgroundDaemonEnabled: true,
  samplingIntervalSeconds: 5,
  cellThrottleEnabled: true,
  slaThresholds: {
    criticalRttMs: 80,
    criticalJitterMs: 15,
    criticalLossPercent: 2.0,
  },
};

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('dash');
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [networkState, setNetworkState] = useState<NetworkStateInfo | null>(null);
  const [currentGeo, setCurrentGeo] = useState<GeoCoordinates | null>(null);
  const [sessions, setSessions] = useState<QoSSession[]>([]);
  const [selectedDetailSession, setSelectedDetailSession] = useState<QoSSession | null>(null);
  const [pingStats, setPingStats] = useState<Map<string, AggregatedPingStats>>(new Map());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // 1. Initialize services and load initial database state
  useEffect(() => {
    async function bootstrap() {
      await DatabaseService.init();
      await AlertService.init();
      await BackgroundMeasurementService.initBackgroundFetch(config);
      await refreshData();
    }
    bootstrap();

    // Listen to network changes
    const unsubNet = NetInfo.addEventListener(async () => {
      const state = await NativeTelephonyService.getCurrentNetworkState();
      setNetworkState(state);
    });

    return () => unsubNet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Periodic background telemetry ticker (RF-07)
  useEffect(() => {
    let intervalTimer: any = null;
    const pingEngine = new PingEngine();

    const runTelemetryCycle = async () => {
      try {
        const stats = await pingEngine.runBatchProbes(config.targetHosts, 3, 200);
        setPingStats(stats);

        if (config.backgroundDaemonEnabled) {
          const statsArr = Array.from(stats.values());
          if (statsArr.length > 0) {
            const avgRtt = statsArr.reduce((a, b) => a + b.avg, 0) / statsArr.length;
            const avgJitter = statsArr.reduce((a, b) => a + b.jitter, 0) / statsArr.length;
            const avgLoss = statsArr.reduce((a, b) => a + b.lossPercent, 0) / statsArr.length;
            await AlertService.evaluateAndNotify(avgRtt, avgJitter, avgLoss, config.slaThresholds);
          }
        }
      } catch (err) {
        console.warn('[App] Telemetry cycle error:', err);
      }
    };

    runTelemetryCycle();
    intervalTimer = setInterval(runTelemetryCycle, config.samplingIntervalSeconds * 1000);

    // Sync background fetch with config changes
    BackgroundMeasurementService.updateConfig(config);

    return () => {
      if (intervalTimer) clearInterval(intervalTimer);
      pingEngine.stop();
    };
  }, [config]);

  // 3. Refresh data helper
  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [netState, geo, loadedSessions] = await Promise.all([
        NativeTelephonyService.getCurrentNetworkState(),
        GeoService.getCurrentLocation(),
        DatabaseService.getSessions(),
      ]);

      setNetworkState(netState);
      setCurrentGeo(geo);
      setSessions(loadedSessions);
    } catch (err) {
      console.warn('[App] Refresh error:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Manual sampling in current point
  const handleManualSample = async () => {
    const geo = await GeoService.getCurrentLocation();
    setCurrentGeo(geo);

    const isWifi = networkState?.type === 'wifi';

    const newSession: QoSSession = {
      id: `SEQ-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: Date.now(),
      networkType: networkState?.telephony?.networkType || (isWifi ? 'WIFI' : '4G LTE'),
      operator: NativeTelephonyService.resolveNetworkLabel(networkState),
      signalLevel: networkState?.telephony?.signalLevel ?? 4,
      signalDbm: networkState?.telephony?.signalDbm ?? -82,
      latitude: geo.latitude,
      longitude: geo.longitude,
      altitude: geo.altitude,
      accuracy: geo.accuracy,
      avgRtt: 16.8,
      minRtt: 12.4,
      maxRtt: 22.1,
      jitter: 1.8,
      lossPercent: 0.0,
      downloadMbps: 210.4,
      uploadMbps: 38.5,
      status: 'NOMINAL',
    };

    await DatabaseService.saveSession(newSession);
    await refreshData();
  };

  const handleTestComplete = (session: QoSSession) => {
    setSessions(prev => [session, ...prev]);
    setSelectedDetailSession(session);
    setActiveTab('log');
  };

  const lastSession = sessions.length > 0 ? sessions[0] : null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Top Industrial NOC Navigation Header */}
      <TopNavHeader
        currentTab={selectedDetailSession ? 'DETAIL' : activeTab}
        networkInterface={networkState?.type === 'wifi' ? 'wlan0' : 'rmnet0/5G'}
      />

      {/* Screen Router */}
      <View style={styles.main}>
        {selectedDetailSession ? (
          <SessionDetailScreen
            session={selectedDetailSession}
            onBack={() => setSelectedDetailSession(null)}
          />
        ) : (
          <>
            {activeTab === 'dash' && (
              <DashboardScreen
                networkState={networkState}
                pingStats={pingStats}
                lastSession={lastSession}
                currentGeo={currentGeo}
                slaThresholds={config.slaThresholds}
                isRefreshing={isRefreshing}
                onRefresh={refreshData}
                onExecuteDiagnostic={() => setActiveTab('test')}
                onNavigateToMap={() => setActiveTab('map')}
              />
            )}

            {activeTab === 'test' && (
              <LiveTestScreen
                backendUrl={config.backendUrl}
                targetHosts={config.targetHosts}
                networkState={networkState}
                slaThresholds={config.slaThresholds}
                onTestComplete={handleTestComplete}
              />
            )}

            {activeTab === 'map' && (
              <CoverageMapScreen
                currentGeo={currentGeo}
                sessions={sessions}
                networkState={networkState}
                onManualSample={handleManualSample}
              />
            )}

            {activeTab === 'log' && (
              <HistoryScreen
                sessions={sessions}
                currentGeo={currentGeo}
                onSelectSession={session => setSelectedDetailSession(session)}
              />
            )}

            {activeTab === 'config' && (
              <ConfigScreen
                config={config}
                onUpdateConfig={newConfig => setConfig(newConfig)}
              />
            )}
          </>
        )}
      </View>

      {/* Bottom Rigid Navigation Bar */}
      <BottomTabBar
        activeTab={activeTab}
        onSelectTab={tab => {
          setSelectedDetailSession(null);
          setActiveTab(tab);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  main: {
    flex: 1,
  },
});
