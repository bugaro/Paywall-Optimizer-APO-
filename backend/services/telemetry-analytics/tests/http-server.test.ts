import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { app, setMetricsAggregator } from '../src/infrastructure/http/server';
import * as dbModule from '../src/infrastructure/db';
import type { MetricsAggregator } from '../src/application/use-cases/metrics-aggregator';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  AuthorizationError,
  InvalidOperationError,
} from '../src/domain/errors';

vi.mock('../src/infrastructure/db');

describe('Hono HTTP API Server Specification', () => {
  let mockAggregator: { pushEvent: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockAggregator = {
      pushEvent: vi.fn(),
    };
    setMetricsAggregator(mockAggregator as unknown as MetricsAggregator);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const mock = dbModule as unknown as {
    abTestRepository: { getActiveByAppId: ReturnType<typeof vi.fn>; createActive: ReturnType<typeof vi.fn> };
    telemetryRepository: { getAggregatedMetrics: ReturnType<typeof vi.fn>; save: ReturnType<typeof vi.fn>; saveBatch: ReturnType<typeof vi.fn> };
  };

  describe('Correlation ID & Structured Logging Middleware', () => {
    it('should extract X-Correlation-ID header and populate in log storage', async () => {
      const correlationId = 'test-correlation-uuid-1234';

      const res = await app.request('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': correlationId,
        },
        body: JSON.stringify({
          userId: '00000000-0000-0000-0000-000000000001',
          appId: '00000000-0000-0000-0000-000000000002',
          eventType: 'impression',
        }),
      });

      expect(res.status).toBe(202);
    });

    it('should generate a new Correlation ID if X-Correlation-ID is missing', async () => {
      const res = await app.request('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: '00000000-0000-0000-0000-000000000001',
          appId: '00000000-0000-0000-0000-000000000002',
          eventType: 'impression',
        }),
      });

      expect(res.status).toBe(202);
    });
  });

  describe('POST /api/events', () => {
    it('should accept valid payloads and return 202 with variant assignment', async () => {
      mock.abTestRepository.getActiveByAppId.mockResolvedValue({
        id: 'test-ab-id',
        sampleSizePercent: 10,
      });

      const res = await app.request('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: '88a38de2-80de-4417-bd92-4933a1e34e9e',
          appId: '11a38de2-80de-4417-bd92-4933a1e34e9e',
          eventType: 'impression',
        }),
      });

      expect(res.status).toBe(202);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.variant).toMatch(/A|B/);
      expect(mockAggregator.pushEvent).toHaveBeenCalledTimes(1);
    });

    it('should fail with 400 Bad Request on invalid payloads (Payload Validation)', async () => {
      const payloads = [
        { userId: 'invalid-uuid', appId: '00000000-0000-0000-0000-000000000002', eventType: 'impression' },
        { userId: '00000000-0000-0000-0000-000000000001', appId: '00000000-0000-0000-0000-000000000002', eventType: 'invalid-event' },
        { appId: '00000000-0000-0000-0000-000000000002', eventType: 'purchase' },
      ];

      for (const payload of payloads) {
        const res = await app.request('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        expect(res.status).toBe(400);
      }
    });

    it('should default to Variant A if no active A/B test is found', async () => {
      mock.abTestRepository.getActiveByAppId.mockResolvedValue(null);

      const res = await app.request('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: '88a38de2-80de-4417-bd92-4933a1e34e9e',
          appId: '11a38de2-80de-4417-bd92-4933a1e34e9e',
          eventType: 'impression',
        }),
      });

      expect(res.status).toBe(202);
      const json = await res.json();
      expect(json.variant).toBe('A');
    });
  });

  describe('Domain Error mapping to HTTP Boundaries', () => {
    it('should map ValidationError to 400 Bad Request', async () => {
      mock.abTestRepository.getActiveByAppId.mockRejectedValue(new ValidationError('Invalid parameter'));
      const res = await app.request('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: '00000000-0000-0000-0000-000000000001',
          appId: '00000000-0000-0000-0000-000000000002',
          eventType: 'impression',
        }),
      });
      expect(res.status).toBe(400);
    });

    it('should map NotFoundError to 404 Not Found', async () => {
      mock.abTestRepository.getActiveByAppId.mockRejectedValue(new NotFoundError('App not found'));
      const res = await app.request('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: '00000000-0000-0000-0000-000000000001',
          appId: '00000000-0000-0000-0000-000000000002',
          eventType: 'impression',
        }),
      });
      expect(res.status).toBe(404);
    });

    it('should map ConflictError to 409 Conflict', async () => {
      mock.abTestRepository.getActiveByAppId.mockRejectedValue(new ConflictError('State conflict'));
      const res = await app.request('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: '00000000-0000-0000-0000-000000000001',
          appId: '00000000-0000-0000-0000-000000000002',
          eventType: 'impression',
        }),
      });
      expect(res.status).toBe(409);
    });

    it('should map AuthorizationError to 403 Forbidden', async () => {
      mock.abTestRepository.getActiveByAppId.mockRejectedValue(new AuthorizationError('Not authorized'));
      const res = await app.request('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: '00000000-0000-0000-0000-000000000001',
          appId: '00000000-0000-0000-0000-000000000002',
          eventType: 'impression',
        }),
      });
      expect(res.status).toBe(403);
    });

    it('should map InvalidOperationError to 400 Bad Request', async () => {
      mock.abTestRepository.getActiveByAppId.mockRejectedValue(new InvalidOperationError('Invalid operation'));
      const res = await app.request('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: '00000000-0000-0000-0000-000000000001',
          appId: '00000000-0000-0000-0000-000000000002',
          eventType: 'impression',
        }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/metrics', () => {
    it('should return 400 Bad Request if appId is missing', async () => {
      const res = await app.request('/api/metrics');
      expect(res.status).toBe(400);
    });

    it('should return 400 Bad Request if appId is an invalid UUID', async () => {
      const res = await app.request('/api/metrics?appId=invalid-uuid');
      expect(res.status).toBe(400);
    });

    it('should return aggregated metrics time-series with correct structure', async () => {
      const appId = '00000000-0000-0000-0000-000000000002';
      const mockMetricsSeries = [
        {
          timestamp: new Date().toISOString(),
          variant: 'A',
          impressions: 100,
          clicks: 10,
          purchases: 2,
          conversionRate: 0.02,
        },
        {
          timestamp: new Date().toISOString(),
          variant: 'B',
          impressions: 100,
          clicks: 15,
          purchases: 5,
          conversionRate: 0.05,
        },
      ];
      mock.telemetryRepository.getAggregatedMetrics.mockResolvedValue(mockMetricsSeries);

      const res = await app.request(`/api/metrics?appId=${appId}`);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toBeInstanceOf(Array);
      expect(json[0].variant).toBe('A');
      expect(json[0].conversionRate).toBe(0.02);
      expect(json[1].variant).toBe('B');
      expect(json[1].conversionRate).toBe(0.05);
    });

    it('should return 400 Bad Request if a malformed date is supplied in since parameter', async () => {
      const res = await app.request('/api/metrics?appId=00000000-0000-0000-0000-000000000002&since=malformed-date');
      expect(res.status).toBe(400);
    });
  });

  describe('GET /metrics', () => {
    it('should expose prometheus statistics', async () => {
      const res = await app.request('/metrics');
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain('http_requests_total');
      expect(text).toContain('http_request_duration_seconds');
    });
  });
});
