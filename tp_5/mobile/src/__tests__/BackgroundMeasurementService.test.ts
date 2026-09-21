import { BackgroundMeasurementService } from '../services/BackgroundMeasurementService';
import { AppConfig } from '../types';

// Mock dependencies
jest.mock('react-native-background-fetch', () => ({
  configure: jest.fn().mockResolvedValue(undefined),
  start: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn().mockResolvedValue(undefined),
  finish: jest.fn(),
  registerHeadlessTask: jest.fn(),
  NETWORK_TYPE_ANY: 2,
}));

jest.mock('../services/PingEngine', () => ({
  PingEngine: jest.fn().mockImplementation(() => ({
    runBatchProbes: jest.fn().mockResolvedValue(
      new Map([
        ['host-1', { hostId: 'host-1', hostName: 'Test', host: '1.1.1.1', min: 10, avg: 15, max: 25, jitter: 2, sent: 3, lost: 0, lossPercent: 0, status: 'OK' }],
      ])
    ),
  })),
}));

jest.mock('../services/GeoService', () => ({
  GeoService: {
    getCurrentLocation: jest.fn().mockResolvedValue({
      latitude: -34.6037,
      longitude: -58.3816,
      altitude: 25,
      accuracy: 1.5,
      timestamp: Date.now(),
    }),
  },
}));

jest.mock('../services/DatabaseService', () => ({
  DatabaseService: {
    init: jest.fn().mockResolvedValue(undefined),
    saveSession: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../services/AlertService', () => ({
  AlertService: {
    init: jest.fn().mockResolvedValue(undefined),
    evaluateAndNotify: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../services/NativeTelephony', () => ({
  NativeTelephonyService: {
    getCurrentNetworkState: jest.fn().mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'cellular',
      telephony: {
        operatorName: 'Test Carrier',
        plmn: '722-310',
        networkType: '4G LTE',
        isRoaming: false,
        signalLevel: 3,
        signalDbm: -85,
      },
    }),
    resolveNetworkLabel: jest.fn((netState) => netState?.telephony?.operatorName || 'Test Carrier'),
  },
}));

const BackgroundFetch = require('react-native-background-fetch');
const { DatabaseService } = require('../services/DatabaseService');
const { AlertService } = require('../services/AlertService');

const TEST_CONFIG: AppConfig = {
  targetHosts: [
    { id: 'host-1', name: 'Test Host', host: '1.1.1.1', port: 80 },
  ],
  backendUrl: 'http://localhost:3000',
  backgroundDaemonEnabled: true,
  samplingIntervalSeconds: 5,
  cellThrottleEnabled: false,
  slaThresholds: {
    criticalRttMs: 80,
    criticalJitterMs: 15,
    criticalLossPercent: 2.0,
  },
};

describe('BackgroundMeasurementService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('configures background fetch with correct options', async () => {
    await BackgroundMeasurementService.initBackgroundFetch(TEST_CONFIG);

    expect(BackgroundFetch.configure).toHaveBeenCalledTimes(1);
    const [config] = BackgroundFetch.configure.mock.calls[0];
    expect(config.stopOnTerminate).toBe(false);
    expect(config.startOnBoot).toBe(true);
    expect(config.enableHeadless).toBe(true);
    expect(config.requiredNetworkType).toBe(2);
  });

  it('starts background fetch when daemon is enabled', async () => {
    await BackgroundMeasurementService.initBackgroundFetch(TEST_CONFIG);

    expect(BackgroundFetch.start).toHaveBeenCalledTimes(1);
    expect(BackgroundFetch.stop).not.toHaveBeenCalled();
  });

  it('stops background fetch when daemon is disabled', async () => {
    const disabledConfig = { ...TEST_CONFIG, backgroundDaemonEnabled: false };
    await BackgroundMeasurementService.initBackgroundFetch(disabledConfig);

    expect(BackgroundFetch.stop).toHaveBeenCalledTimes(1);
  });

  it('executes background measurement cycle successfully', async () => {
    await BackgroundMeasurementService.initBackgroundFetch(TEST_CONFIG);
    await BackgroundMeasurementService.executeBackgroundMeasurement();

    expect(DatabaseService.saveSession).toHaveBeenCalledTimes(1);
    const savedSession = DatabaseService.saveSession.mock.calls[0][0];

    expect(savedSession.id).toMatch(/^BG-/);
    expect(savedSession.avgRtt).toBe(15);
    expect(savedSession.status).toBe('NOMINAL');
    expect(savedSession.latitude).toBe(-34.6037);
    expect(savedSession.longitude).toBe(-58.3816);
  });

  it('evaluates SLA and notifies after measurement', async () => {
    await BackgroundMeasurementService.initBackgroundFetch(TEST_CONFIG);
    await BackgroundMeasurementService.executeBackgroundMeasurement();

    expect(AlertService.evaluateAndNotify).toHaveBeenCalledTimes(1);
    const [rtt, jitter, loss, thresholds] = AlertService.evaluateAndNotify.mock.calls[0];
    expect(rtt).toBe(15);
    expect(jitter).toBe(2);
    expect(loss).toBe(0);
    expect(thresholds).toEqual(TEST_CONFIG.slaThresholds);
  });

  it('handles headless task with timeout', async () => {
    await BackgroundMeasurementService.headlessTask({ taskId: 'test-task', timeout: true });

    expect(BackgroundFetch.finish).toHaveBeenCalledWith('test-task');
    expect(DatabaseService.saveSession).not.toHaveBeenCalled();
  });

  it('handles headless task normally', async () => {
    await BackgroundMeasurementService.initBackgroundFetch(TEST_CONFIG);
    await BackgroundMeasurementService.headlessTask({ taskId: 'test-task', timeout: false });

    expect(DatabaseService.init).toHaveBeenCalled();
    expect(AlertService.init).toHaveBeenCalled();
    expect(BackgroundFetch.finish).toHaveBeenCalledWith('test-task');
  });

  it('updates config to toggle background fetch', async () => {
    await BackgroundMeasurementService.initBackgroundFetch(TEST_CONFIG);
    jest.clearAllMocks();

    await BackgroundMeasurementService.updateConfig({ ...TEST_CONFIG, backgroundDaemonEnabled: false });
    expect(BackgroundFetch.stop).toHaveBeenCalledTimes(1);

    jest.clearAllMocks();
    await BackgroundMeasurementService.updateConfig(TEST_CONFIG);
    expect(BackgroundFetch.start).toHaveBeenCalledTimes(1);
  });
});
