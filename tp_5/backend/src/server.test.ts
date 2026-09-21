import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { app } from './server.js';

describe('QoS Benchmark Backend API', () => {
  before(async () => {
    process.env.NODE_ENV = 'test';
    await app.ready();
  });

  after(async () => {
    await app.close();
  });

  test('GET /ping returns 200 and server status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/ping',
    });

    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.status, 'ok');
    assert.strictEqual(typeof body.serverTime, 'number');
  });

  test('GET /download returns specified byte payload', async () => {
    // Request 1 MB payload
    const response = await app.inject({
      method: 'GET',
      url: '/download?size=1',
    });

    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(response.headers['content-type'], 'application/octet-stream');
    assert.strictEqual(response.rawPayload.length, 1024 * 1024);
  });

  test('POST /upload receives payload and calculates transfer metrics', async () => {
    const payload = Buffer.alloc(256 * 1024, 0xaa); // 256 KB

    const response = await app.inject({
      method: 'POST',
      url: '/upload',
      headers: {
        'content-type': 'application/octet-stream',
      },
      payload,
    });

    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.status, 'ok');
    assert.strictEqual(body.receivedBytes, 256 * 1024);
    assert.strictEqual(typeof body.durationMs, 'number');
    assert.strictEqual(typeof body.serverCalculatedMbps, 'number');
  });
});
