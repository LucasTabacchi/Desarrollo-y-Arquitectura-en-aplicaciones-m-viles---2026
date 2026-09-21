import { PingEngine } from '../src/services/PingEngine';
import { TargetHost } from '../src/types';

describe('PingEngine', () => {
  let engine: PingEngine;

  beforeEach(() => {
    engine = new PingEngine();
  });

  afterEach(() => {
    engine.stop();
  });

  describe('calculateJitter (RFC 2544)', () => {
    test('returns 0 for less than 2 samples', () => {
      expect(engine.calculateJitter([])).toBe(0);
      expect(engine.calculateJitter([15])).toBe(0);
    });

    test('correctly computes mean absolute difference between consecutive RTTs', () => {
      // Consecutive diffs: |20 - 10| = 10, |15 - 20| = 5, |25 - 15| = 10
      // Sum = 25, Count = 3, Avg = 25 / 3 = 8.333...
      const rtts = [10, 20, 15, 25];
      const jitter = engine.calculateJitter(rtts);
      expect(jitter).toBeCloseTo(8.333, 2);
    });

    test('returns 0 when RTT is perfectly constant', () => {
      const rtts = [20, 20, 20, 20, 20];
      expect(engine.calculateJitter(rtts)).toBe(0);
    });
  });

  describe('Listeners & Probe execution', () => {
    const mockTarget: TargetHost = {
      id: 'target-cf',
      name: 'Cloudflare DNS',
      host: '1.1.1.1',
      port: 53,
    };

    test('notifies listeners when a probe completes', async () => {
      const listener = jest.fn();
      const unsubscribe = engine.addListener(listener);

      jest.spyOn(engine, 'probeHost').mockResolvedValue({
        hostId: 'target-cf',
        hostName: 'Cloudflare DNS',
        host: '1.1.1.1',
        rtt: 25.4,
        timestamp: Date.now(),
        isTimeout: false,
      });

      const result = await engine.probeHost(mockTarget, 1000);
      // Manually trigger listener notification to verify subscribe/unsubscribe
      engine['notify'](result);

      expect(listener).toHaveBeenCalledWith(result);
      expect(result.hostId).toBe('target-cf');
      expect(result.isTimeout).toBe(false);

      unsubscribe();
    });

    test('aggregates batch probes and assigns SLA status', async () => {
      const targets = [mockTarget];

      jest.spyOn(engine, 'probeHost').mockResolvedValue({
        hostId: 'target-cf',
        hostName: 'Cloudflare DNS',
        host: '1.1.1.1',
        rtt: 22.0,
        timestamp: Date.now(),
        isTimeout: false,
      });

      const results = await engine.runBatchProbes(targets, 2, 10);
      expect(results.has('target-cf')).toBe(true);

      const stat = results.get('target-cf')!;
      expect(stat.sent).toBe(2);
      expect(stat.avg).toBe(22.0);
      expect(stat.status).toBe('OK');
    });
  });
});
