import { describe, it, expect, vi, beforeEach } from 'vitest';
import { app } from '../../src/infrastructure/server.ts';
import { logger } from '../../src/infrastructure/logger.ts';

describe('Hono Server Integration Specifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200 OK on GET /health', async () => {
    // Given & When
    const res = await app.request('/health');

    // Then
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: 'ok', service: 'mastra-ai' });
  });

  it('should return metrics on GET /metrics', async () => {
    // Given & When
    const res = await app.request('/metrics');

    // Then
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('http_requests_total');
  });

  it('should generate and return X-Correlation-ID header if none is provided', async () => {
    // Given & When
    const res = await app.request('/health');

    // Then
    const correlationId = res.headers.get('X-Correlation-ID');
    expect(correlationId).toBeDefined();
    expect(correlationId).not.toBeNull();
  });

  it('should preserve and forward X-Correlation-ID header if provided', async () => {
    // Given
    const testCorrelationId = 'custom-correlation-id-1234';

    // When
    const res = await app.request('/health', {
      headers: {
        'X-Correlation-ID': testCorrelationId
      }
    });

    // Then
    expect(res.headers.get('X-Correlation-ID')).toBe(testCorrelationId);
  });

  it('should set agentId to paywall-optimizer for MUTATE_STREAM route requests', async () => {
    // Given
    const infoSpy = vi.spyOn(logger, 'info');

    // When
    await app.request('/api/reasoning/mutate/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}), // Empty body triggers 400 but middleware still runs finally block
    });

    // Then
    const hasAgentId = infoSpy.mock.calls.some(call => {
      const logObj = call[0];
      return typeof logObj === 'object' && logObj !== null && (logObj as Record<string, unknown>).agentId === 'paywall-optimizer';
    });

    expect(hasAgentId).toBe(true);
  });
});
