import { Share } from 'react-native';
import { QoSSession } from '../types';

export class ExportService {
  /**
   * Serializes session array into RFC 4180 compliant CSV
   */
  public static toCSV(sessions: QoSSession[]): string {
    const headers = [
      'id',
      'timestamp_iso',
      'network_type',
      'operator',
      'signal_level',
      'signal_dbm',
      'latitude',
      'longitude',
      'altitude',
      'accuracy',
      'avg_rtt_ms',
      'min_rtt_ms',
      'max_rtt_ms',
      'jitter_ms',
      'loss_percent',
      'download_mbps',
      'upload_mbps',
      'status',
    ];

    const rows = sessions.map(s => [
      `"${s.id}"`,
      `"${new Date(s.timestamp).toISOString()}"`,
      `"${s.networkType}"`,
      `"${s.operator}"`,
      s.signalLevel,
      s.signalDbm,
      s.latitude,
      s.longitude,
      s.altitude ?? '',
      s.accuracy ?? '',
      s.avgRtt,
      s.minRtt,
      s.maxRtt,
      s.jitter,
      s.lossPercent,
      s.downloadMbps,
      s.uploadMbps,
      `"${s.status}"`,
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  /**
   * Serializes session array to formatted JSON string
   */
  public static toJSON(sessions: QoSSession[]): string {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        totalSessions: sessions.length,
        sessions,
      },
      null,
      2
    );
  }

  /**
   * Opens OS share sheet to export data to file, email, or clipboard
   */
  public static async share(content: string, filename: string): Promise<void> {
    try {
      await Share.share({
        title: `Export ${filename}`,
        message: content,
      });
    } catch (err) {
      console.warn('[ExportService] Share error:', err);
    }
  }
}
