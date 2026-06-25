import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { app } from '../src/infrastructure/server.ts';
import { initiateAbExperimentTool, remediateBreachTool } from '../src/infrastructure/agent.ts';
import { ValidationError, DomainError } from '../src/domain/errors.ts';
import type { TelemetryMetrics, PaywallMutation } from '../src/domain/types.ts';

interface RemediateBreachResult {
  metrics: TelemetryMetrics;
  mutation: PaywallMutation;
  cardType: string;
}


describe('Copilot Bridge Integration Test Suite', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // ==========================================
  // HTTP Server & Middleware
  // ==========================================
  describe('HTTP Server Endpoints', () => {
    it('GET /metrics should return 200 and Prometheus text payload', async () => {
      // Given: The Hono app is running
      // When: We request the /metrics endpoint
      const res = await app.request('/metrics');

      // Then: It should return 200 OK and Prom-formatted metrics containing http_requests_total
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain('http_requests_total');
    });

    it('GET /copilot/chat/info should be registered and return non-404', async () => {
      // Given: The Hono app is running
      // When: We request /copilot/chat/info
      const res = await app.request('/copilot/chat/info');

      // Then: The route is registered and does not return 404
      expect(res.status).not.toBe(404);
    });
  });

  // ==========================================
  // CopilotKit Actions/Tools - initiateAbExperiment
  // ==========================================
  describe('Action/Tool: initiateAbExperiment', () => {
    it('should successfully initiate experiment for valid inputs', async () => {
      // Given: A valid split config payload and a working telemetry service
      const appId = '00000000-0000-0000-0000-000000000002';
      const sampleSizePercent = 50;
      const mutation = {
        price: '$7.99',
        theme: 'dark-slate' as const,
        ctaCopy: 'Commit to your fitness today. Get 20% off forever.',
      };

      const mockResponse = { id: 'experiment-id-123', appId, sampleSizePercent, isActive: true, status: 'running' };
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      // When: The tool is executed
      const result = await initiateAbExperimentTool.execute({ appId, sampleSizePercent, mutation });

      // Then: The downstream request is made and returns success
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ success: true });
    });

    // Boundary Edge Cases Suite
    describe('Boundary Checks for sampleSizePercent', () => {
      const boundaryCases = [
        { value: 0, expectedValid: true },
        { value: 100, expectedValid: true },
        { value: -1, expectedValid: false },
        { value: 101, expectedValid: false },
      ];

      boundaryCases.forEach(({ value, expectedValid }) => {
        it(`should treat sampleSizePercent=${value} as ${expectedValid ? 'VALID' : 'INVALID'}`, async () => {
          const appId = '00000000-0000-0000-0000-000000000002';
          const mutation = {
            price: '$7.99',
            theme: 'dark-slate' as const,
            ctaCopy: 'Commit to your fitness today.',
          };

          if (expectedValid) {
            // Given: Telemetry service returns 201 success
            vi.mocked(globalThis.fetch).mockResolvedValueOnce({
              ok: true,
              json: async () => ({ success: true }),
            } as Response);

            // When: Tool is executed
            const result = await initiateAbExperimentTool.execute({ appId, sampleSizePercent: value, mutation });
            // Then: It returns success
            expect(result).toEqual({ success: true });
          } else {
            // When/Then: Tool is executed, it throws ValidationError
            await expect(
              initiateAbExperimentTool.execute({ appId, sampleSizePercent: value, mutation })
            ).rejects.toThrow(ValidationError);
          }
        });
      });
    });

    // Downstream Error Scenarios
    describe('Downstream Failures & Stability', () => {
      it('should map downstream 500 error to DomainError', async () => {
        // Given: Telemetry service returns a 500 Internal Server Error
        const appId = '00000000-0000-0000-0000-000000000002';
        vi.mocked(globalThis.fetch).mockResolvedValueOnce({
          ok: false,
          status: 500,
        } as Response);

        // When/Then: Tool is executed, it throws a DomainError
        await expect(
          initiateAbExperimentTool.execute({
            appId,
            sampleSizePercent: 50,
            mutation: { price: '$7.99', theme: 'dark-slate' as const, ctaCopy: 'Commit' },
          })
        ).rejects.toThrow(DomainError);
      });

      it('should log warning and throw DomainError on downstream request timeout', async () => {
        // Given: Telemetry service request hangs and triggers abort
        const appId = '00000000-0000-0000-0000-000000000002';
        const abortError = new Error('The user aborted a request.');
        abortError.name = 'AbortError';

        vi.mocked(globalThis.fetch).mockRejectedValueOnce(abortError);

        // When/Then: Tool is executed, it throws a DomainError
        await expect(
          initiateAbExperimentTool.execute({
            appId,
            sampleSizePercent: 50,
            mutation: { price: '$7.99', theme: 'dark-slate' as const, ctaCopy: 'Commit' },
          })
        ).rejects.toThrow(DomainError);
      });
    });
  });

  // ==========================================
  // CopilotKit Actions/Tools - remediateBreach
  // ==========================================
  describe('Action/Tool: remediateBreach', () => {
    it('should request metrics and propose optimized mutation for App B with conversion rate < 3%', async () => {
      // Given: App B (Fitness Tracker) metrics show conversion rate < 3% (0.015)
      const appId = 'app-b-uuid';
      const mockMetrics = [
        { timestamp: '2026-06-21T21:00:00Z', variant: 'A', impressions: 100, clicks: 10, purchases: 1, conversionRate: 0.01 },
        { timestamp: '2026-06-21T21:05:00Z', variant: 'B', impressions: 100, clicks: 12, purchases: 2, conversionRate: 0.02 },
      ];

      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetrics,
      } as Response);

      // When: The tool is executed
      const result = (await remediateBreachTool.execute({ appId })) as RemediateBreachResult;

      // Then: It returns aggregated metrics and the optimized mutation proposal
      expect(result).toEqual({
        metrics: {
          impressions: 200,
          clicks: 22,
          conversions: 3,
          conversionRate: 0.015,
        },
        mutation: {
          price: '$7.99',
          theme: 'dark-slate',
          ctaCopy: 'Commit to your fitness today. Get 20% off forever.',
        },
        cardType: 'PaywallExperimentCard',
      });
    });

    it('should return control values for other apps or if conversion rate >= 3%', async () => {
      // Given: App B (Fitness Tracker) metrics show conversion rate >= 3% (0.04)
      const appId = 'app-b-uuid';
      const mockMetrics = [
        { timestamp: '2026-06-21T21:00:00Z', variant: 'A', impressions: 100, clicks: 10, purchases: 4, conversionRate: 0.04 },
      ];

      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetrics,
      } as Response);

      // When: The tool is executed
      const result = (await remediateBreachTool.execute({ appId })) as RemediateBreachResult;

      // Then: It returns control values
      expect(result.mutation).toEqual({
        price: '$9.99',
        theme: 'light',
        ctaCopy: 'Start your free trial today.',
      });
    });
  });
});
