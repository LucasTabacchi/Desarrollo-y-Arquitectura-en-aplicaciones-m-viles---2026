import { ThroughputRunner } from '../src/services/ThroughputRunner';

describe('ThroughputRunner', () => {
  let runner: ThroughputRunner;
  const mockBackendUrl = 'http://127.0.0.1:3000';

  beforeEach(() => {
    runner = new ThroughputRunner();
    jest.clearAllMocks();
  });

  afterEach(() => {
    runner.cancel();
  });

  test('calculates correct download throughput based on received bytes and duration', async () => {
    const mockByteSize = 5 * 1024 * 1024; // 5 MB
    const fakeBlob = { size: mockByteSize };

    // Mock fetch for download
    (globalThis as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      blob: jest.fn().mockResolvedValue(fakeBlob),
    });

    const progressSpy = jest.fn();
    const result = await runner.runDownloadTest(mockBackendUrl, 5, progressSpy);

    expect(result.bytes).toBe(mockByteSize);
    expect(result.mbps).toBeGreaterThan(0);
    expect(progressSpy).toHaveBeenCalledWith('DOWNLOAD', expect.any(Number), 1.0);
  });

  test('calculates correct upload throughput based on sent payload', async () => {
    (globalThis as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ receivedBytes: 2 * 1024 * 1024 }),
    });

    const progressSpy = jest.fn();
    const result = await runner.runUploadTest(mockBackendUrl, 2, progressSpy);

    expect(result.bytes).toBe(2 * 1024 * 1024);
    expect(result.mbps).toBeGreaterThan(0);
    expect(progressSpy).toHaveBeenCalledWith('UPLOAD', expect.any(Number), 1.0);
  });

  test('throws error when server responds with non-200 status', async () => {
    (globalThis as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
    });

    await expect(runner.runDownloadTest(mockBackendUrl, 1)).rejects.toThrow(
      'Download failed with status 503'
    );
  });

  test('handles cancellation via AbortController gracefully', async () => {
    (globalThis as any).fetch = jest.fn().mockImplementation(() => {
      runner.cancel();
      const err: any = new Error('The user aborted a request.');
      err.name = 'AbortError';
      return Promise.reject(err);
    });

    const result = await runner.runDownloadTest(mockBackendUrl, 5);
    expect(result.mbps).toBe(0);
  });
});
