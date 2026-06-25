import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchClient } from '../../../../src/shared/api/client';
import { ApiError, ValidationError } from '../../../../src/shared/api/errors';
import { logger } from '../../../../src/shared/lib/logger';

// Mock the logger
vi.mock('../../../../src/shared/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('fetchClient', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });

  // --- Correlation ID Injection ---
  it('should automatically inject a valid UUID into X-Correlation-ID header', async () => {
    // Given
    let requestHeaders: Headers | undefined;
    globalThis.fetch = vi.fn().mockImplementation(async (input, init) => {
      requestHeaders = new Headers(init?.headers);
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    });

    // When
    await fetchClient('/api/test');

    // Then
    expect(requestHeaders).toBeDefined();
    const correlationId = requestHeaders?.get('X-Correlation-ID');
    expect(correlationId).toBeDefined();
    // Validate UUID format (v4)
    expect(correlationId).match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('should allow overriding X-Correlation-ID and other headers', async () => {
    // Given
    let requestHeaders: Headers | undefined;
    globalThis.fetch = vi.fn().mockImplementation(async (input, init) => {
      requestHeaders = new Headers(init?.headers);
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    });
    const customCorrelationId = 'custom-uuid-1234';

    // When
    await fetchClient('/api/test', {
      headers: {
        'X-Correlation-ID': customCorrelationId,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    // Then
    expect(requestHeaders?.get('X-Correlation-ID')).toBe(customCorrelationId);
    expect(requestHeaders?.get('Content-Type')).toBe('application/x-www-form-urlencoded');
  });

  // --- Timeout Handlers ---
  it('should abort and throw ApiError if request exceeds 5000ms timeout threshold', async () => {
    // Given
    globalThis.fetch = vi.fn().mockImplementation(async (input, init) => {
      const signal = init?.signal;
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          resolve(new Response(JSON.stringify({ data: 'ok' })));
        }, 6000);
        signal?.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new DOMException('The user aborted a request.', 'AbortError'));
        });
      });
    });

    // When & Then
    const promise = fetchClient('/api/test');
    
    // Fast-forward time to trigger timeout
    vi.advanceTimersByTime(5000);

    await expect(promise).rejects.toThrow(ApiError);
    await expect(promise).rejects.toThrow('Request timed out after 5000ms');
  });

  // --- Observability & Logging Assertions ---
  it('should log request success with correct metadata and correlation ID', async () => {
    // Given
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: 'payload' }), { status: 200 })
    );

    // When
    await fetchClient('/api/test');

    // Then
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('[API Request] SUCCESS'),
      expect.objectContaining({
        url: '/api/test',
        status: 200,
        correlationId: expect.any(String),
        duration: expect.any(Number),
      })
    );
  });

  it('should log request failures with correlation ID', async () => {
    // Given
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Bad request details' }), { status: 400 })
    );

    // When & Then
    await expect(fetchClient('/api/test')).rejects.toThrow(ValidationError);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('[API Request] FAILURE'),
      expect.objectContaining({
        url: '/api/test',
        status: 400,
        correlationId: expect.any(String),
      })
    );
  });

  // --- Boundary & Edge Case Suite ---
  describe('Edge Cases & Response Handling', () => {
    it('should throw ValidationError on status code 400', async () => {
      // Given
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'validation fail' }), { status: 400 })
      );

      // When & Then
      await expect(fetchClient('/api/test')).rejects.toThrow(ValidationError);
    });

    it('should throw ApiError on status code 500', async () => {
      // Given
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response('Internal Server Error', { status: 500 })
      );

      // When & Then
      await expect(fetchClient('/api/test')).rejects.toThrow(ApiError);
    });

    it('should handle empty responses gracefully', async () => {
      // Given
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(null, { status: 204 })
      );

      // When
      const result = await fetchClient('/api/test');

      // Then
      expect(result).toBeNull();
    });
  });
});
