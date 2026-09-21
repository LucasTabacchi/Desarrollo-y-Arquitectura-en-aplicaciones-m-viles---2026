import notifee, { AndroidImportance } from '@notifee/react-native';
import { SLAThresholds } from '../types';

export class AlertService {
  private static channelCreated = false;

  public static async init(): Promise<void> {
    try {
      if (!this.channelCreated) {
        await notifee.createChannel({
          id: 'qos_sla_alerts',
          name: 'Alertas de Calidad de Red QoS',
          importance: AndroidImportance.HIGH,
          vibration: true,
        });
        this.channelCreated = true;
      }
    } catch (err) {
      console.warn('[AlertService] Failed to create notification channel:', err);
    }
  }

  /**
   * Evaluates measured QoS metrics against SLA thresholds and dispatches a local notification if degraded
   */
  public static async evaluateAndNotify(
    rtt: number,
    jitter: number,
    lossPercent: number,
    thresholds: SLAThresholds
  ): Promise<boolean> {
    const isRttCritical = rtt > thresholds.criticalRttMs;
    const isJitterCritical = jitter > thresholds.criticalJitterMs;
    const isLossCritical = lossPercent > thresholds.criticalLossPercent;

    if (!isRttCritical && !isJitterCritical && !isLossCritical) {
      return false; // Nominal SLA
    }

    const reasons: string[] = [];
    if (isRttCritical) reasons.push(`RTT: ${rtt.toFixed(1)}ms (> ${thresholds.criticalRttMs}ms)`);
    if (isJitterCritical) reasons.push(`Jitter: ${jitter.toFixed(1)}ms (> ${thresholds.criticalJitterMs}ms)`);
    if (isLossCritical) reasons.push(`Pérdida: ${lossPercent.toFixed(1)}% (> ${thresholds.criticalLossPercent}%)`);

    try {
      await this.init();
      await notifee.displayNotification({
        title: '[ALERTA SLA] DEGRADACIÓN SEVERA DE RED (QoS SLA)',
        body: `Se detectaron parámetros fuera de norma: ${reasons.join(', ')}`,
        android: {
          channelId: 'qos_sla_alerts',
          importance: AndroidImportance.HIGH,
          smallIcon: 'ic_launcher',
          color: '#ffb4ab',
          pressAction: {
            id: 'default',
          },
        },
      });
      return true;
    } catch (err) {
      console.warn('[AlertService] Notification dispatch error:', err);
      return false;
    }
  }
}
