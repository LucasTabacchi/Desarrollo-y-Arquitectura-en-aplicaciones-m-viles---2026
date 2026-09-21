import { ExportService } from '../src/services/ExportService';
import { QoSSession } from '../src/types';

describe('ExportService', () => {
  const mockSessions: QoSSession[] = [
    {
      id: 'SEQ-1001',
      timestamp: 1715694612000,
      networkType: '5G NR',
      operator: 'Claro AR',
      signalLevel: 4,
      signalDbm: -79,
      latitude: -34.6037,
      longitude: -58.3816,
      altitude: 28,
      accuracy: 2.4,
      avgRtt: 15.2,
      minRtt: 12.1,
      maxRtt: 21.0,
      jitter: 1.4,
      lossPercent: 0.0,
      downloadMbps: 284.2,
      uploadMbps: 48.6,
      status: 'NOMINAL',
    },
    {
      id: 'SEQ-1002',
      timestamp: 1715695000000,
      networkType: 'WIFI',
      operator: 'Fibertel, S.A.', // Comma in operator name
      signalLevel: 3,
      signalDbm: -65,
      latitude: -34.6040,
      longitude: -58.3820,
      avgRtt: 85.0,
      minRtt: 40.0,
      maxRtt: 150.0,
      jitter: 12.0,
      lossPercent: 1.0,
      downloadMbps: 45.0,
      uploadMbps: 10.0,
      status: 'DEGRADED',
    },
  ];

  describe('toCSV', () => {
    test('toCSV produces RFC 4180 header and escaped rows', () => {
      const csv = ExportService.toCSV(mockSessions);
      const lines = csv.split('\n');

      expect(lines.length).toBe(3); // 1 header + 2 data rows
      expect(lines[0]).toBe(
        'id,timestamp_iso,network_type,operator,signal_level,signal_dbm,latitude,longitude,altitude,accuracy,avg_rtt_ms,min_rtt_ms,max_rtt_ms,jitter_ms,loss_percent,download_mbps,upload_mbps,status'
      );
      expect(lines[1]).toContain('"SEQ-1001"');
      expect(lines[1]).toContain('"5G NR"');
      expect(lines[1]).toContain('284.2');

      // Operator with comma should remain safely inside quotes
      expect(lines[2]).toContain('"Fibertel, S.A."');
      expect(lines[2]).toContain('"DEGRADED"');
    });

    test('toCSV handles empty session list by outputting only headers', () => {
      const csv = ExportService.toCSV([]);
      const lines = csv.split('\n');
      expect(lines.length).toBe(1);
      expect(lines[0]).toContain('id,timestamp_iso');
    });
  });

  describe('toJSON', () => {
    test('toJSON outputs valid RFC 8259 JSON structure with metadata', () => {
      const jsonStr = ExportService.toJSON(mockSessions);
      const parsed = JSON.parse(jsonStr);

      expect(parsed).toHaveProperty('exportedAt');
      expect(parsed.totalSessions).toBe(2);
      expect(parsed.sessions).toHaveLength(2);
      expect(parsed.sessions[0].id).toBe('SEQ-1001');
      expect(parsed.sessions[1].operator).toBe('Fibertel, S.A.');
    });

    test('toJSON handles empty list cleanly', () => {
      const jsonStr = ExportService.toJSON([]);
      const parsed = JSON.parse(jsonStr);
      expect(parsed.totalSessions).toBe(0);
      expect(parsed.sessions).toEqual([]);
    });
  });
});
