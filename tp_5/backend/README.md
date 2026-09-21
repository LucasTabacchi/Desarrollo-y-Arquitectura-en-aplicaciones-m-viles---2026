# QoS Reference Benchmark Server

Lightweight, high-performance Node.js & Fastify benchmark backend for **TP5 - Network QoS Monitor** (RF-03).

## Endpoints

- `GET /ping`: Instant healthcheck returning JSON `{ status: 'ok', serverTime: timestamp }`.
- `GET /download`: Streams non-compressible binary payload for downlink throughput testing.
  - Query parameters:
    - `size`: Size in Megabytes (e.g. `?size=10` for 10 MB, default: 10 MB).
    - `bytes`: Exact size in bytes.
- `POST /upload`: High-speed binary payload sink for uplink throughput testing.
  - Returns JSON `{ status: 'ok', receivedBytes: N, durationMs: M, serverCalculatedMbps: X }`.

## Running Locally

```bash
cd backend
npm install
npm run dev   # Starts with hot-reload on port 3000
npm run build # Builds to dist/
npm start     # Runs production bundle
```

## Running with Docker

```bash
docker build -t qos-benchmark-backend .
docker run -p 3000:3000 qos-benchmark-backend
```
