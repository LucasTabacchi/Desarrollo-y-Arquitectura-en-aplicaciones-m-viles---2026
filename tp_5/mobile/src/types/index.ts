export type NetworkType = 'WIFI' | '5G NR' | '4G LTE' | '3G HSPA' | '2G EDGE' | 'UNKNOWN';

export interface TelephonyInfo {
  operatorName: string;
  plmn: string;
  networkType: string;
  isRoaming: boolean;
  signalLevel: number; // 0..4 bars
  signalDbm: number;   // dBm e.g. -85
}

export interface NetworkStateInfo {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string; // wifi, cellular, none, etc.
  details?: {
    isConnectionExpensive?: boolean;
    cellularGeneration?: string | null;
    carrier?: string | null;
    ssid?: string | null;
  };
  telephony?: TelephonyInfo;
}

export interface TargetHost {
  id: string;
  name: string;
  host: string;
  port: number;
}

export interface PingProbeResult {
  hostId: string;
  hostName: string;
  host: string;
  rtt: number; // ms
  timestamp: number;
  isTimeout: boolean;
}

export interface AggregatedPingStats {
  hostId: string;
  hostName: string;
  host: string;
  min: number;
  avg: number;
  max: number;
  jitter: number; // ms mean absolute deviation
  sent: number;
  lost: number;
  lossPercent: number;
  status: 'OK' | 'WARN' | 'CRIT';
}

export interface ThroughputResult {
  downloadMbps: number;
  uploadMbps: number;
  downloadBytes: number;
  uploadBytes: number;
  durationMs: number;
}

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  accuracy?: number | null;
  timestamp: number;
}

export interface QoSSession {
  id: string;
  timestamp: number;
  networkType: string;
  operator: string;
  signalLevel: number;
  signalDbm: number;
  latitude: number;
  longitude: number;
  altitude?: number | null;
  accuracy?: number | null;
  avgRtt: number;
  minRtt: number;
  maxRtt: number;
  jitter: number;
  lossPercent: number;
  downloadMbps: number;
  uploadMbps: number;
  status: 'NOMINAL' | 'DEGRADED' | 'CRITICAL';
  samples?: QoSSample[];
}

export interface QoSSample {
  id: string;
  sessionId: string;
  timestamp: number;
  phase: 'PING' | 'DOWNLOAD' | 'UPLOAD';
  metricName: string;
  metricValue: number;
}

export interface SLAThresholds {
  criticalRttMs: number;       // default: 80 ms
  criticalJitterMs: number;    // default: 15 ms
  criticalLossPercent: number; // default: 2.0 %
}

export interface AppConfig {
  targetHosts: TargetHost[];
  backendUrl: string; // e.g. http://10.0.2.2:3000 on Android emulator, or http://192.168.1.X:3000
  backgroundDaemonEnabled: boolean;
  samplingIntervalSeconds: number; // 1, 5, 30
  cellThrottleEnabled: boolean;
  slaThresholds: SLAThresholds;
}

export interface GeoBoundingBox {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}
