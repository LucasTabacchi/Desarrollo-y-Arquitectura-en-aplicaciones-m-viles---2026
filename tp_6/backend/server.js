const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// In-memory store for sync data
const serverDatabase = {
  installations: new Map(),
  diagnostics: new Map(),
  versions: new Map(),
};

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'NetDiag Sync Hub',
    timestamp: Date.now(),
    uptime: process.uptime(),
  });
});

// Push endpoint for mobile app outbox sync
app.post('/sync/push', (req, res) => {
  const { items, force } = req.body;

  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Payload must contain an "items" array.' });
  }

  const results = [];

  for (const item of items) {
    const { id, entityType, entityId, payloadJson, baseVersion } = item;
    let payload = {};
    try {
      payload = typeof payloadJson === 'string' ? JSON.parse(payloadJson) : payloadJson;
    } catch {
      payload = {};
    }

    // Conflict simulation: if payload explicitly requests conflict or entityId matches conflict-test
    const isConflictSimulated =
      payload.simulateConflict === true ||
      entityId === 'conflict-test' ||
      entityId?.includes('conflict');

    const currentServerVersion = serverDatabase.versions.get(entityId) || 1;

    if (!force && isConflictSimulated && (baseVersion || 1) < 2) {
      return res.status(409).json({
        error: 'Conflict detected',
        conflictId: id,
        entityId: entityId,
        serverVersion: {
          id: entityId,
          deviceName: payload.deviceName || 'Router MikroTik hAP ac2',
          siteName: payload.siteName || 'Sitio Azotea Norte',
          notes: 'Equipo registrado en Nodo Central. Notas distintas a las locales.',
          version: 2,
          updatedAt: Date.now(),
        },
        localVersion: payload,
      });
    }

    // Normal successful persistence
    const nextVersion = currentServerVersion + 1;
    serverDatabase.versions.set(entityId, nextVersion);

    if (entityType === 'installation') {
      serverDatabase.installations.set(entityId, { ...payload, version: nextVersion });
    } else if (entityType === 'diagnostic') {
      serverDatabase.diagnostics.set(entityId, { ...payload, version: nextVersion });
    }

    results.push({
      id: id,
      entityId: entityId,
      status: 'synced',
      version: nextVersion,
    });
  }

  res.json({
    status: 'success',
    processed: results.length,
    results: results,
  });
});

// Pull endpoint to fetch server updates
app.get('/sync/pull', (req, res) => {
  const since = Number(req.query.since) || 0;
  const installations = Array.from(serverDatabase.installations.values()).filter(
    (i) => (i.updatedAt || 0) > since
  );
  const diagnostics = Array.from(serverDatabase.diagnostics.values()).filter(
    (d) => (d.updatedAt || 0) > since
  );

  res.json({
    status: 'success',
    timestamp: Date.now(),
    updates: {
      installations,
      diagnostics,
    },
  });
});

app.listen(PORT, () => {
  console.log(`[NetDiag Backend] Sync stub server running on port ${PORT}`);
});
