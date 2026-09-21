import { DatabaseService } from '../src/services/DatabaseService';
import { QoSSession } from '../src/types';

describe('DatabaseService', () => {
  const sessionA: QoSSession = {
    id: 'SESSION-001',
    timestamp: 1715694000000,
    networkType: '5G NR',
    operator: 'Claro AR',
    signalLevel: 4,
    signalDbm: -75,
    latitude: -34.6037,
    longitude: -58.3816,
    altitude: 25.0,
    accuracy: 3.0,
    avgRtt: 18.5,
    minRtt: 14.0,
    maxRtt: 25.0,
    jitter: 2.1,
    lossPercent: 0.0,
    downloadMbps: 180.5,
    uploadMbps: 45.2,
    status: 'NOMINAL',
  };

  const sessionB: QoSSession = {
    id: 'SESSION-002',
    timestamp: 1715698000000,
    networkType: '4G LTE',
    operator: 'Personal',
    signalLevel: 2,
    signalDbm: -95,
    latitude: -34.6050,
    longitude: -58.3830,
    altitude: 22.0,
    accuracy: 5.0,
    avgRtt: 92.4,
    minRtt: 60.0,
    maxRtt: 180.0,
    jitter: 24.5,
    lossPercent: 1.5,
    downloadMbps: 22.4,
    uploadMbps: 4.1,
    status: 'DEGRADED',
  };

  beforeEach(async () => {
    await DatabaseService.clearAllSessions();
  });

  test('saves and retrieves sessions from database store', async () => {
    await DatabaseService.saveSession(sessionA);
    const sessions = await DatabaseService.getSessions();

    expect(sessions.length).toBe(1);
    expect(sessions[0].id).toBe('SESSION-001');
    expect(sessions[0].avgRtt).toBe(18.5);
  });

  test('retrieves a specific session by ID', async () => {
    await DatabaseService.saveSession(sessionA);
    await DatabaseService.saveSession(sessionB);

    const found = await DatabaseService.getSessionById('SESSION-002');
    expect(found).not.toBeNull();
    expect(found?.operator).toBe('Personal');
    expect(found?.status).toBe('DEGRADED');

    const notFound = await DatabaseService.getSessionById('NON-EXISTENT');
    expect(notFound).toBeNull();
  });

  test('filters sessions by network type', async () => {
    await DatabaseService.saveSession(sessionA);
    await DatabaseService.saveSession(sessionB);

    const lteSessions = await DatabaseService.getSessions({ networkType: '4G' });
    expect(lteSessions.length).toBe(1);
    expect(lteSessions[0].id).toBe('SESSION-002');

    const nrSessions = await DatabaseService.getSessions({ networkType: '5G' });
    expect(nrSessions.length).toBe(1);
    expect(nrSessions[0].id).toBe('SESSION-001');
  });

  test('filters sessions by time window', async () => {
    await DatabaseService.saveSession(sessionA);
    await DatabaseService.saveSession(sessionB);

    const results = await DatabaseService.getSessions({
      startDate: 1715695000000,
      endDate: 1715700000000,
    });

    expect(results.length).toBe(1);
    expect(results[0].id).toBe('SESSION-002');
  });

  test('clears all sessions properly', async () => {
    await DatabaseService.saveSession(sessionA);
    await DatabaseService.saveSession(sessionB);

    await DatabaseService.clearAllSessions();
    const sessions = await DatabaseService.getSessions();
    expect(sessions.length).toBe(0);
  });
});
