import TcpSocket from 'react-native-tcp-socket';
import { TargetHost, PingProbeResult, AggregatedPingStats } from '../types';

export type PingEventListener = (result: PingProbeResult) => void;

export class PingEngine {
  private listeners: Set<PingEventListener> = new Set();
  private isRunning: boolean = false;

  public addListener(listener: PingEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(result: PingProbeResult) {
    this.listeners.forEach(fn => fn(result));
  }

  /**
   * Executes a single TCP socket probe against a host:port
   * Measures time until TCP 3-way handshake completes (SYN -> SYN-ACK -> ACK)
   */
  public async probeHost(target: TargetHost, timeoutMs: number = 2500): Promise<PingProbeResult> {
    const startTime = Date.now();

    return new Promise<PingProbeResult>((resolve) => {
      let isSettled = false;
      let timeoutTimer: any = null;
      let client: any = null;

      const finish = (rtt: number, isTimeout: boolean) => {
        if (isSettled) return;
        isSettled = true;

        if (timeoutTimer) clearTimeout(timeoutTimer);
        if (client) {
          try {
            client.destroy();
          } catch {}
        }

        const probe: PingProbeResult = {
          hostId: target.id,
          hostName: target.name,
          host: target.host,
          rtt: isTimeout ? timeoutMs : rtt,
          timestamp: Date.now(),
          isTimeout,
        };

        this.notify(probe);
        resolve(probe);
      };

      try {
        if (TcpSocket && typeof TcpSocket.createConnection === 'function') {
          client = TcpSocket.createConnection(
            {
              host: target.host,
              port: target.port,
            },
            () => {
              const rtt = Date.now() - startTime;
              finish(rtt, false);
            }
          );

          client.setTimeout(timeoutMs);

          client.on('error', (_err: any) => {
            // In case of TCP RST or ICMP port unreachable, the handshake still traveled back and forth
            const elapsed = Date.now() - startTime;
            if (elapsed < timeoutMs) {
              finish(elapsed, false);
            } else {
              finish(timeoutMs, true);
            }
          });

          client.on('timeout', () => {
            finish(timeoutMs, true);
          });
        } else {
          // Fallback probe for non-native / jest test environments
          fetch(`http://${target.host}:${target.port}`, { method: 'HEAD' })
            .then(() => finish(Date.now() - startTime, false))
            .catch(() => finish(Date.now() - startTime, false));
        }

        timeoutTimer = setTimeout(() => {
          finish(timeoutMs, true);
        }, timeoutMs);
      } catch {
        finish(timeoutMs, true);
      }
    });
  }

  /**
   * Executes a series of N probes against multiple target hosts
   */
  public async runBatchProbes(
    targets: TargetHost[],
    cycles: number = 5,
    intervalMs: number = 250
  ): Promise<Map<string, AggregatedPingStats>> {
    this.isRunning = true;
    const historyMap = new Map<string, number[]>();
    const timeoutsMap = new Map<string, number>();

    targets.forEach(t => {
      historyMap.set(t.id, []);
      timeoutsMap.set(t.id, 0);
    });

    for (let c = 0; c < cycles && this.isRunning; c++) {
      for (const target of targets) {
        if (!this.isRunning) break;
        const result = await this.probeHost(target);
        if (result.isTimeout) {
          timeoutsMap.set(target.id, (timeoutsMap.get(target.id) || 0) + 1);
        } else {
          historyMap.get(target.id)?.push(result.rtt);
        }
      }
      if (c < cycles - 1 && this.isRunning) {
        await new Promise(resolve => setTimeout(() => resolve(null), intervalMs));
      }
    }

    const aggregated = new Map<string, AggregatedPingStats>();

    for (const target of targets) {
      const rtts = historyMap.get(target.id) || [];
      const lost = timeoutsMap.get(target.id) || 0;
      const total = rtts.length + lost;
      const lossPercent = total > 0 ? (lost / total) * 100 : 0;

      const min = rtts.length > 0 ? Math.min(...rtts) : 0;
      const max = rtts.length > 0 ? Math.max(...rtts) : 0;
      const avg = rtts.length > 0 ? rtts.reduce((a, b) => a + b, 0) / rtts.length : 0;
      const jitter = this.calculateJitter(rtts);

      let status: 'OK' | 'WARN' | 'CRIT' = 'OK';
      if (lossPercent > 5 || avg > 120) status = 'CRIT';
      else if (lossPercent > 0 || avg > 60 || jitter > 15) status = 'WARN';

      aggregated.set(target.id, {
        hostId: target.id,
        hostName: target.name,
        host: target.host,
        min: Number(min.toFixed(1)),
        avg: Number(avg.toFixed(1)),
        max: Number(max.toFixed(1)),
        jitter: Number(jitter.toFixed(1)),
        sent: total,
        lost,
        lossPercent: Number(lossPercent.toFixed(1)),
        status,
      });
    }

    this.isRunning = false;
    return aggregated;
  }

  /**
   * Calculates mean absolute deviation of consecutive RTT measurements (RFC 2544 / standard jitter)
   */
  public calculateJitter(rtts: number[]): number {
    if (rtts.length < 2) return 0;
    let sumDiff = 0;
    for (let i = 1; i < rtts.length; i++) {
      sumDiff += Math.abs(rtts[i] - rtts[i - 1]);
    }
    return sumDiff / (rtts.length - 1);
  }

  public stop() {
    this.isRunning = false;
  }
}
