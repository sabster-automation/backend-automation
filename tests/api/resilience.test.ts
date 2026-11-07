import { describe, it, expect } from 'vitest';
import { defaultApiClient } from '../../src/core/http/ApiClient';

describe('HTTP Client Resilience & Retry Interceptor', () => {
  it('should automatically retry flaky 503 endpoint and succeed', async () => {
    // /api/v1/flaky fails with 503 until retry attempt succeeds
    const response = await defaultApiClient.get('/api/v1/flaky', {
      retries: 3,
      retryDelayMs: 100,
    });

    expect(response.status).toBe(200);
    expect(response.data.message).toBe('Success after retry recovery');
  });

  it('should include request duration metadata on all responses', async () => {
    const response = await defaultApiClient.get('/api/v1/health');
    expect(response.status).toBe(200);
    expect(response.durationMs).toBeGreaterThanOrEqual(0);
    expect(typeof response.durationMs).toBe('number');
  });
});
