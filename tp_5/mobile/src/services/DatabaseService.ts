import SQLite, { SQLiteDatabase } from 'react-native-sqlite-storage';
import { QoSSession, QoSSample, GeoBoundingBox } from '../types';

SQLite.enablePromise(true);

export class DatabaseService {
  private static db: SQLiteDatabase | null = null;
  private static inMemorySessions: QoSSession[] = []; // In-memory fallback if native SQLite fails

  public static async init(): Promise<void> {
    try {
      this.db = await SQLite.openDatabase({
        name: 'network_qos.db',
        location: 'default',
      });

      await this.createTables();
    } catch (err) {
      console.warn('[DatabaseService] Native SQLite initialization fallback to memory:', err);
      // Seed default demo sessions if in-memory
      if (this.inMemorySessions.length === 0) {
        this.seedInitialData();
      }
    }
  }

  private static async createTables(): Promise<void> {
    if (!this.db) return;

    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        timestamp INTEGER,
        network_type TEXT,
        operator TEXT,
        signal_level INTEGER,
        signal_dbm INTEGER,
        latitude REAL,
        longitude REAL,
        altitude REAL,
        accuracy REAL,
        avg_rtt REAL,
        min_rtt REAL,
        max_rtt REAL,
        jitter REAL,
        loss_percent REAL,
        download_mbps REAL,
        upload_mbps REAL,
        status TEXT
      );
    `);

    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS samples (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        timestamp INTEGER,
        phase TEXT,
        metric_name TEXT,
        metric_value REAL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );
    `);
  }

  public static async saveSession(session: QoSSession): Promise<void> {
    if (this.db) {
      try {
        await this.db.executeSql(
          `INSERT OR REPLACE INTO sessions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            session.id,
            session.timestamp,
            session.networkType,
            session.operator,
            session.signalLevel,
            session.signalDbm,
            session.latitude,
            session.longitude,
            session.altitude || 0,
            session.accuracy || 0,
            session.avgRtt,
            session.minRtt,
            session.maxRtt,
            session.jitter,
            session.lossPercent,
            session.downloadMbps,
            session.uploadMbps,
            session.status,
          ]
        );

        if (session.samples && session.samples.length > 0) {
          for (const sample of session.samples) {
            await this.db.executeSql(
              `INSERT OR REPLACE INTO samples VALUES (?, ?, ?, ?, ?, ?);`,
              [
                sample.id,
                session.id,
                sample.timestamp,
                sample.phase,
                sample.metricName,
                sample.metricValue,
              ]
            );
          }
        }
        return;
      } catch (err) {
        console.warn('[DatabaseService] SQL Insert error, saving to memory:', err);
      }
    }

    // In-memory fallback
    const idx = this.inMemorySessions.findIndex(s => s.id === session.id);
    if (idx >= 0) {
      this.inMemorySessions[idx] = session;
    } else {
      this.inMemorySessions.unshift(session);
    }
  }

  public static async getSessions(filter?: {
    networkType?: string;
    startDate?: number;
    endDate?: number;
    geoBox?: GeoBoundingBox;
  }): Promise<QoSSession[]> {
    if (this.db) {
      try {
        let query = 'SELECT * FROM sessions WHERE 1=1';
        const params: any[] = [];

        if (filter?.networkType && filter.networkType !== 'ALL') {
          query += ' AND network_type LIKE ?';
          params.push(`%${filter.networkType}%`);
        }

        if (filter?.startDate) {
          query += ' AND timestamp >= ?';
          params.push(filter.startDate);
        }

        if (filter?.endDate) {
          query += ' AND timestamp <= ?';
          params.push(filter.endDate);
        }

        if (filter?.geoBox) {
          query += ' AND latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?';
          params.push(filter.geoBox.minLat, filter.geoBox.maxLat, filter.geoBox.minLon, filter.geoBox.maxLon);
        }

        query += ' ORDER BY timestamp DESC LIMIT 200;';

        const [results] = await this.db.executeSql(query, params);
        const sessions: QoSSession[] = [];
        for (let i = 0; i < results.rows.length; i++) {
          const row = results.rows.item(i);
          sessions.push(this.mapRowToSession(row));
        }
        return sessions;
      } catch (err) {
        console.warn('[DatabaseService] SQL Select error, falling back to memory:', err);
      }
    }

    // In-memory filter
    return this.inMemorySessions.filter(s => {
      if (filter?.networkType && filter.networkType !== 'ALL' && !s.networkType.includes(filter.networkType)) {
        return false;
      }
      if (filter?.startDate && s.timestamp < filter.startDate) return false;
      if (filter?.endDate && s.timestamp > filter.endDate) return false;
      if (filter?.geoBox) {
        if (s.latitude < filter.geoBox.minLat || s.latitude > filter.geoBox.maxLat) return false;
        if (s.longitude < filter.geoBox.minLon || s.longitude > filter.geoBox.maxLon) return false;
      }
      return true;
    });
  }

  public static async getSessionById(id: string): Promise<QoSSession | null> {
    if (this.db) {
      try {
        const [results] = await this.db.executeSql('SELECT * FROM sessions WHERE id = ?;', [id]);
        if (results.rows.length > 0) {
          const session = this.mapRowToSession(results.rows.item(0));
          const [sampleResults] = await this.db.executeSql(
            'SELECT * FROM samples WHERE session_id = ? ORDER BY timestamp ASC;',
            [id]
          );
          const samples: QoSSample[] = [];
          for (let i = 0; i < sampleResults.rows.length; i++) {
            const row = sampleResults.rows.item(i);
            samples.push({
              id: row.id,
              sessionId: row.session_id,
              timestamp: row.timestamp,
              phase: row.phase,
              metricName: row.metric_name,
              metricValue: row.metric_value,
            });
          }
          session.samples = samples;
          return session;
        }
      } catch (err) {
        console.warn('[DatabaseService] SQL GetById error:', err);
      }
    }

    return this.inMemorySessions.find(s => s.id === id) || null;
  }

  public static async clearAllSessions(): Promise<void> {
    if (this.db) {
      try {
        await this.db.executeSql('DELETE FROM samples;');
        await this.db.executeSql('DELETE FROM sessions;');
      } catch {}
    }
    this.inMemorySessions = [];
  }

  private static mapRowToSession(row: any): QoSSession {
    return {
      id: row.id,
      timestamp: row.timestamp,
      networkType: row.network_type,
      operator: row.operator,
      signalLevel: row.signal_level,
      signalDbm: row.signal_dbm,
      latitude: row.latitude,
      longitude: row.longitude,
      altitude: row.altitude,
      accuracy: row.accuracy,
      avgRtt: row.avg_rtt,
      minRtt: row.min_rtt,
      maxRtt: row.max_rtt,
      jitter: row.jitter,
      lossPercent: row.loss_percent,
      downloadMbps: row.download_mbps,
      uploadMbps: row.upload_mbps,
      status: row.status,
    };
  }

  private static seedInitialData() {
    const now = Date.now();
    this.inMemorySessions = [
      {
        id: 'SEQ-1044',
        timestamp: now - 5 * 60 * 1000,
        networkType: '5G NR',
        operator: 'Claro AR',
        signalLevel: 4,
        signalDbm: -79,
        latitude: -34.6037,
        longitude: -58.3816,
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
        id: 'SEQ-1043',
        timestamp: now - 35 * 60 * 1000,
        networkType: '4G LTE',
        operator: 'Movistar AR',
        signalLevel: 3,
        signalDbm: -88,
        latitude: -34.6084,
        longitude: -58.3721,
        avgRtt: 44.1,
        minRtt: 28.0,
        maxRtt: 98.0,
        jitter: 8.2,
        lossPercent: 1.5,
        downloadMbps: 42.0,
        uploadMbps: 9.8,
        status: 'DEGRADED',
      },
      {
        id: 'SEQ-1042',
        timestamp: now - 2 * 3600 * 1000,
        networkType: 'WIFI',
        operator: 'Fibertel 5.8G',
        signalLevel: 4,
        signalDbm: -62,
        latitude: -34.6012,
        longitude: -58.3845,
        avgRtt: 8.4,
        minRtt: 6.2,
        maxRtt: 12.5,
        jitter: 0.9,
        lossPercent: 0.0,
        downloadMbps: 310.5,
        uploadMbps: 52.1,
        status: 'NOMINAL',
      },
    ];
  }
}
