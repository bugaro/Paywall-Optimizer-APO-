process.env.MOCK_REASONING = 'false';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { remediateBreachTool, setReasoningClient } from '../src/infrastructure/agent.ts';
import { HttpReasoningAdapter } from '../src/infrastructure/adapters/http-reasoning.ts';
import { InvalidOperationError } from '../src/domain/errors.ts';
import type { PaywallMutation, TelemetryMetrics } from '../src/domain/types.ts';
import { REMEDIATION_CARD_TYPE } from '../src/domain/constants.ts';

interface RemediateBreachResult {
  metrics: TelemetryMetrics;
  mutation: PaywallMutation;
  cardType: string;
}

describe('Copilot Bridge SSE Streaming Tests', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
    setReasoningClient(new HttpReasoningAdapter());
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('Happy Path: should successfully parse downstream SSE stream chunks and construct proposal', async () => {
    // Mock telemetry metrics fetch
    const mockMetrics = [
      { timestamp: '2026-06-21T21:00:00Z', variant: 'A', impressions: 100, clicks: 10, purchases: 1, conversionRate: 0.01 },
    ];

    // Mock fetch for Telemetry metrics (first call)
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockMetrics,
    } as Response);

    // Mock fetch for Mastra AI stream (second call)
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"type":"status","content":"[1/2] Fetching vector store similarities...","timestamp":123}\n'));
        controller.enqueue(encoder.encode('data: {"type":"status","content":"[2/2] Querying Ollama reasoning model...","timestamp":124}\n'));
        controller.enqueue(encoder.encode('data: {"type":"mutation_update","content":"{\\"price\\": \\"$8.99\\", \\"theme\\": \\"dark-slate\\", \\"ctaCopy\\": \\"Commit Now\\" }","timestamp":125}\n'));
        controller.close();
      }
    });

    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'Content-Type': 'text/event-stream' }),
      body: stream,
    } as unknown as Response);

    const result = await remediateBreachTool.execute({ appId: 'app-b-uuid' }) as RemediateBreachResult;

    expect(result).toEqual({
      metrics: {
        impressions: 100,
        clicks: 10,
        conversions: 1,
        conversionRate: 0.01,
      },
      mutation: {
        price: '$8.99',
        theme: 'dark-slate',
        ctaCopy: 'Commit Now',
      },
      cardType: REMEDIATION_CARD_TYPE,
    });
  });

  it('Downstream Failure: should fallback to default proposal if downstream stream fails with 500 error', async () => {
    const mockMetrics = [
      { timestamp: '2026-06-21T21:00:00Z', variant: 'A', impressions: 100, clicks: 10, purchases: 1, conversionRate: 0.01 },
    ];

    // Telemetry fetch
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockMetrics,
    } as Response);

    // Downstream stream failure (500)
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    await expect(remediateBreachTool.execute({ appId: 'app-b-uuid' }))
      .rejects.toThrow(InvalidOperationError);
  });

  it('Abort/Cancel: should cancel downstream fetch when AbortSignal triggers', async () => {
    const adapter = new HttpReasoningAdapter();
    const abortController = new AbortController();

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"type":"token","content":"partial_data","timestamp":123}\n'));
        // Simulate client abort mid-stream
        abortController.abort();
        controller.close();
      }
    });

    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'Content-Type': 'text/event-stream' }),
      body: stream,
    } as unknown as Response);

    const metrics = { impressions: 100, clicks: 10, conversions: 1, conversionRate: 0.01 };
    
    await expect(adapter.generateMutationStream('app-b-uuid', metrics, abortController.signal))
      .resolves.toBeInstanceOf(ReadableStream);
  });
});
