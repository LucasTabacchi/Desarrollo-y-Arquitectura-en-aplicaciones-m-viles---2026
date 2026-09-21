import { AlertService } from '../src/services/AlertService';
import notifee from '@notifee/react-native';
import { SLAThresholds } from '../src/types';

describe('AlertService', () => {
  const defaultThresholds: SLAThresholds = {
    criticalRttMs: 150,
    criticalJitterMs: 30,
    criticalLossPercent: 2.0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns false when all metrics are within nominal SLA thresholds', async () => {
    const isDegraded = await AlertService.evaluateAndNotify(
      85, // RTT <= 150
      12, // Jitter <= 30
      0.0, // Loss <= 2%
      defaultThresholds
    );

    expect(isDegraded).toBe(false);
    expect(notifee.displayNotification).not.toHaveBeenCalled();
  });

  test('triggers critical alert when RTT exceeds threshold', async () => {
    const isDegraded = await AlertService.evaluateAndNotify(
      280, // RTT > 150
      10,
      0.0,
      defaultThresholds
    );

    expect(isDegraded).toBe(true);
    expect(notifee.displayNotification).toHaveBeenCalledTimes(1);
    expect(notifee.displayNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining('DEGRADACIÓN SEVERA'),
        body: expect.stringContaining('RTT: 280.0ms (> 150ms)'),
      })
    );
  });

  test('triggers critical alert when Jitter exceeds threshold', async () => {
    const isDegraded = await AlertService.evaluateAndNotify(
      45,
      68.5, // Jitter > 30
      0.0,
      defaultThresholds
    );

    expect(isDegraded).toBe(true);
    expect(notifee.displayNotification).toHaveBeenCalledTimes(1);
    expect(notifee.displayNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining('Jitter: 68.5ms (> 30ms)'),
      })
    );
  });

  test('triggers critical alert when Packet Loss exceeds threshold', async () => {
    const isDegraded = await AlertService.evaluateAndNotify(
      50,
      15,
      5.2, // Loss > 2%
      defaultThresholds
    );

    expect(isDegraded).toBe(true);
    expect(notifee.displayNotification).toHaveBeenCalledTimes(1);
    expect(notifee.displayNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining('Pérdida: 5.2% (> 2%)'),
      })
    );
  });

  test('combines multiple violations in notification description', async () => {
    const isDegraded = await AlertService.evaluateAndNotify(
      310, // RTT violation
      45, // Jitter violation
      4.0, // Loss violation
      defaultThresholds
    );

    expect(isDegraded).toBe(true);
    expect(notifee.displayNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringMatching(/RTT:.*Jitter:.*Pérdida:/),
      })
    );
  });
});
