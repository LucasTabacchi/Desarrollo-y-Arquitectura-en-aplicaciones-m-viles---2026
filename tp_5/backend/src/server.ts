import fastify from 'fastify';
import cors from '@fastify/cors';
import crypto from 'crypto';
import { Readable } from 'stream';

const app = fastify({
  logger: true,
  bodyLimit: 100 * 1024 * 1024, // 100 MB max upload
});

// Enable CORS for mobile and web inspection
await app.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
});

// Accept any content-type for upload benchmarks (binary, form, text, raw)
app.addContentTypeParser('*', (request, payload, done) => {
  const chunks: Buffer[] = [];
  payload.on('data', chunk => {
    chunks.push(chunk);
  });
  payload.on('end', () => {
    done(null, Buffer.concat(chunks));
  });
  payload.on('error', err => {
    done(err, undefined);
  });
});

// Pre-generate a 1MB chunk of random bytes to stream repeatedly (prevents network compression cheating)
const CHUNK_SIZE = 1024 * 1024; // 1 MB
const RANDOM_BUFFER = crypto.randomBytes(CHUNK_SIZE);

// 1. Health check & Ping probe
app.get('/ping', async (request, reply) => {
  return {
    status: 'ok',
    serverTime: Date.now(),
  };
});

// 2. Download endpoint for Throughput DL benchmark
// Query param: size (in MB, default 10MB)
app.get('/download', async (request, reply) => {
  const query = request.query as { size?: string; bytes?: string };
  let targetBytes = 10 * 1024 * 1024; // Default: 10 MB

  if (query.bytes) {
    targetBytes = parseInt(query.bytes, 10);
  } else if (query.size) {
    targetBytes = parseFloat(query.size) * 1024 * 1024;
  }

  // Bound targetBytes between 100 KB and 100 MB
  targetBytes = Math.max(100 * 1024, Math.min(targetBytes, 100 * 1024 * 1024));

  reply.header('Content-Type', 'application/octet-stream');
  reply.header('Content-Length', targetBytes.toString());
  reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  reply.header('Pragma', 'no-cache');

  let sentBytes = 0;
  const stream = new Readable({
    read() {
      if (sentBytes >= targetBytes) {
        this.push(null);
        return;
      }

      const remaining = targetBytes - sentBytes;
      const toSend = Math.min(remaining, CHUNK_SIZE);
      sentBytes += toSend;

      if (toSend === CHUNK_SIZE) {
        this.push(RANDOM_BUFFER);
      } else {
        this.push(RANDOM_BUFFER.subarray(0, toSend));
      }
    },
  });

  return reply.send(stream);
});

// 3. Upload endpoint for Throughput UL benchmark
app.post('/upload', async (request, reply) => {
  const startTime = Date.now();
  let receivedBytes = 0;

  if (Buffer.isBuffer(request.body)) {
    receivedBytes = request.body.length;
  } else if (typeof request.body === 'string') {
    receivedBytes = Buffer.byteLength(request.body);
  } else if (request.raw) {
    // Stream mode
    for await (const chunk of request.raw) {
      receivedBytes += (chunk as Buffer).length;
    }
  }

  const durationMs = Date.now() - startTime;
  const mbps = durationMs > 0 ? (receivedBytes * 8) / (durationMs / 1000) / 1_000_000 : 0;

  reply.header('Cache-Control', 'no-store, no-cache');
  return {
    status: 'ok',
    receivedBytes,
    durationMs,
    serverCalculatedMbps: Number(mbps.toFixed(2)),
  };
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const HOST = '0.0.0.0';

async function start() {
  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`[QoS Benchmark Server] Running on http://localhost:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

export { app };

const isRunningTests =
  process.env.NODE_ENV === 'test' ||
  process.argv.some(arg => arg.includes('test'));

if (!isRunningTests) {
  start();
}
