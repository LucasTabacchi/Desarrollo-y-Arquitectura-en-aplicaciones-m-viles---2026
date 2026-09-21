import { ThroughputResult } from '../types';

export type ThroughputProgressCallback = (
  phase: 'DOWNLOAD' | 'UPLOAD',
  currentMbps: number,
  progressRatio: number
) => void;

export class ThroughputRunner {
  private abortController: AbortController | null = null;
  private isCancelled: boolean = false;

  public cancel() {
    this.isCancelled = true;
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * Executes download throughput test against reference backend
   */
  public async runDownloadTest(
    backendUrl: string,
    sizeMb: number = 5,
    onProgress?: ThroughputProgressCallback
  ): Promise<{ mbps: number; bytes: number; durationMs: number }> {
    this.isCancelled = false;
    this.abortController = new AbortController();

    const url = `${backendUrl.replace(/\/$/, '')}/download?size=${sizeMb}`;

    const startTime = Date.now();
    let receivedBytes = 0;

    try {
      const response = await fetch(url, {
        signal: this.abortController.signal,
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`);
      }

      const blob = await response.blob();
      receivedBytes = blob.size;

      const durationMs = Math.max(1, Date.now() - startTime);
      const mbps = (receivedBytes * 8) / (durationMs / 1000) / 1_000_000;

      onProgress?.('DOWNLOAD', Number(mbps.toFixed(1)), 1.0);

      return {
        mbps: Number(mbps.toFixed(2)),
        bytes: receivedBytes,
        durationMs,
      };
    } catch (err: any) {
      if (this.isCancelled) {
        return { mbps: 0, bytes: receivedBytes, durationMs: Date.now() - startTime };
      }
      throw err;
    }
  }

  /**
   * Executes upload throughput test against reference backend
   */
  public async runUploadTest(
    backendUrl: string,
    sizeMb: number = 2,
    onProgress?: ThroughputProgressCallback
  ): Promise<{ mbps: number; bytes: number; durationMs: number }> {
    this.isCancelled = false;
    this.abortController = new AbortController();

    const targetBytes = sizeMb * 1024 * 1024;
    const url = `${backendUrl.replace(/\/$/, '')}/upload`;

    // Generate non-trivial buffer payload
    const payload = new Uint8Array(targetBytes);
    for (let i = 0; i < targetBytes; i += 1024) {
      payload[i] = (i % 255);
    }

    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Cache-Control': 'no-cache',
        },
        body: payload,
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }

      const durationMs = Math.max(1, Date.now() - startTime);
      const mbps = (targetBytes * 8) / (durationMs / 1000) / 1_000_000;

      onProgress?.('UPLOAD', Number(mbps.toFixed(1)), 1.0);

      return {
        mbps: Number(mbps.toFixed(2)),
        bytes: targetBytes,
        durationMs,
      };
    } catch (err: any) {
      if (this.isCancelled) {
        return { mbps: 0, bytes: 0, durationMs: Date.now() - startTime };
      }
      throw err;
    }
  }

  /**
   * Runs the complete full-suite throughput benchmark (DL then UL)
   */
  public async runFullBenchmark(
    backendUrl: string,
    onProgress?: ThroughputProgressCallback
  ): Promise<ThroughputResult> {
    const dlResult = await this.runDownloadTest(backendUrl, 5, onProgress);
    const ulResult = await this.runUploadTest(backendUrl, 2, onProgress);

    return {
      downloadMbps: dlResult.mbps,
      uploadMbps: ulResult.mbps,
      downloadBytes: dlResult.bytes,
      uploadBytes: ulResult.bytes,
      durationMs: dlResult.durationMs + ulResult.durationMs,
    };
  }
}
