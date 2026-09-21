import BackgroundFetch, { BackgroundFetchConfig } from 'react-native-background-fetch';
import { PingEngine } from './PingEngine';
import { GeoService } from './GeoService';
import { DatabaseService } from './DatabaseService';
import { AlertService } from './AlertService';
import { NativeTelephonyService } from './NativeTelephony';
import { AppConfig, QoSSession } from '../types';

/**
 * Manages periodic QoS measurements in the background using react-native-background-fetch.
 * When the OS wakes the app (even if closed/screen off), this service:
 *   1. Runs a batch ping probe against configured hosts
 *   2. Obtains current GPS coordinates
 *   3. Evaluates SLA thresholds and dispatches notifications if degraded
 *   4. Persists the background session to SQLite
 */
export class BackgroundMeasurementService {
  private static currentConfig: AppConfig | null = null;

  /**
   * Initializes and configures react-native-background-fetch.
   * Must be called once during app bootstrap (e.g. in App.tsx useEffect).
   */
  public static async initBackgroundFetch(config: AppConfig): Promise<void> {
    this.currentConfig = config;

    const fetchConfig: BackgroundFetchConfig = {
      minimumFetchInterval: Math.max(15, Math.floor(config.samplingIntervalSeconds / 60) || 15),
      stopOnTerminate: false,
      startOnBoot: true,
      enableHeadless: true,
      requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
    };

    try {
      await BackgroundFetch.configure(
        fetchConfig,
        async (taskId: string) => {
          console.log('[BackgroundMeasurementService] Background event:', taskId);
          await this.executeBackgroundMeasurement();
          BackgroundFetch.finish(taskId);
        },
        async (taskId: string) => {
          console.warn('[BackgroundMeasurementService] Timeout event:', taskId);
          BackgroundFetch.finish(taskId);
        },
      );

      if (config.backgroundDaemonEnabled) {
        await BackgroundFetch.start();
        console.log('[BackgroundMeasurementService] Background fetch started');
      } else {
        await BackgroundFetch.stop();
        console.log('[BackgroundMeasurementService] Background fetch stopped (disabled in config)');
      }
    } catch (err) {
      console.warn('[BackgroundMeasurementService] Configuration error:', err);
    }
  }

  /**
   * Updates the background fetch state when config changes.
   */
  public static async updateConfig(config: AppConfig): Promise<void> {
    this.currentConfig = config;
    try {
      if (config.backgroundDaemonEnabled) {
        await BackgroundFetch.start();
      } else {
        await BackgroundFetch.stop();
      }
    } catch (err) {
      console.warn('[BackgroundMeasurementService] Update error:', err);
    }
  }

  /**
   * Core measurement cycle executed on each background fetch event.
   * Also usable as the HeadlessTask handler for Android.
   */
  public static async executeBackgroundMeasurement(): Promise<void> {
    const config = this.currentConfig;
    if (!config) {
      console.warn('[BackgroundMeasurementService] No config available, skipping cycle');
      return;
    }

    try {
      const pingEngine = new PingEngine();

      const [stats, geo, netState] = await Promise.all([
        pingEngine.runBatchProbes(config.targetHosts, 3, 200),
        GeoService.getCurrentLocation(),
        NativeTelephonyService.getCurrentNetworkState(),
      ]);

      const statsArr = Array.from(stats.values());
      if (statsArr.length === 0) return;

      const avgRtt = statsArr.reduce((a, b) => a + b.avg, 0) / statsArr.length;
      const minRtt = Math.min(...statsArr.map(s => s.min));
      const maxRtt = Math.max(...statsArr.map(s => s.max));
      const avgJitter = statsArr.reduce((a, b) => a + b.jitter, 0) / statsArr.length;
      const avgLoss = statsArr.reduce((a, b) => a + b.lossPercent, 0) / statsArr.length;

      let status: 'NOMINAL' | 'DEGRADED' | 'CRITICAL' = 'NOMINAL';
      if (avgLoss > config.slaThresholds.criticalLossPercent || avgRtt > config.slaThresholds.criticalRttMs) {
        status = 'CRITICAL';
      } else if (avgLoss > 0 || avgRtt > 60 || avgJitter > config.slaThresholds.criticalJitterMs) {
        status = 'DEGRADED';
      }

      const isWifi = netState?.type === 'wifi';
      const bgSession: QoSSession = {
        id: `BG-${Date.now()}`,
        timestamp: Date.now(),
        networkType: netState?.telephony?.networkType || (isWifi ? 'WIFI' : '4G LTE'),
        operator: NativeTelephonyService.resolveNetworkLabel(netState),
        signalLevel: netState?.telephony?.signalLevel ?? 0,
        signalDbm: netState?.telephony?.signalDbm ?? -999,
        latitude: geo.latitude,
        longitude: geo.longitude,
        altitude: geo.altitude,
        accuracy: geo.accuracy,
        avgRtt: Number(avgRtt.toFixed(1)),
        minRtt: Number(minRtt.toFixed(1)),
        maxRtt: Number(maxRtt.toFixed(1)),
        jitter: Number(avgJitter.toFixed(1)),
        lossPercent: Number(avgLoss.toFixed(1)),
        downloadMbps: 0,
        uploadMbps: 0,
        status,
      };

      await DatabaseService.saveSession(bgSession);

      // Evaluate SLA and notify if degraded
      await AlertService.evaluateAndNotify(avgRtt, avgJitter, avgLoss, config.slaThresholds);

      console.log(`[BackgroundMeasurementService] Cycle complete: RTT=${avgRtt.toFixed(1)}ms status=${status}`);
    } catch (err) {
      console.warn('[BackgroundMeasurementService] Measurement cycle error:', err);
    }
  }

  /**
   * Headless task handler for Android — called when the app is terminated.
   * Registered via BackgroundFetch.registerHeadlessTask() in index.js.
   */
  public static async headlessTask(event: { taskId: string; timeout: boolean }): Promise<void> {
    if (event.timeout) {
      console.warn('[BackgroundMeasurementService] Headless timeout:', event.taskId);
      BackgroundFetch.finish(event.taskId);
      return;
    }

    await DatabaseService.init();
    await AlertService.init();
    await BackgroundMeasurementService.executeBackgroundMeasurement();
    BackgroundFetch.finish(event.taskId);
  }
}
