import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OllamaStreamingAdapter } from '../../src/infrastructure/adapters/ollama-streaming.adapter.ts';

describe('OllamaStreamingAdapter Specifications', () => {
  let adapter: OllamaStreamingAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    adapter = new OllamaStreamingAdapter();
  });

  describe('generateMutationStream', () => {
    const mockMetrics = {
      impressions: 100,
      clicks: 10,
      conversions: 2,
      conversionRate: 0.02,
    };

    it('should emit status then token chunks for a successful stream', async () => {
      const ollamaLines = [
        JSON.stringify({ response: '{"reasoning":', done: false }),
        JSON.stringify({ response: '"test"}', done: true, prompt_eval_count: 5, eval_count: 10 }),
      ];
      const encoder = new TextEncoder();
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(ollamaLines.join('\n')));
          controller.close();
        },
      });

      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: true,
        body: mockStream,
      } as unknown as Response);

      const result = await adapter.generateMutationStream([], mockMetrics);
      const reader = result.getReader();
      const chunks: Array<{ type: string; content: string }> = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      expect(chunks[0].type).toBe('status');
      expect(chunks[1].type).toBe('token');
      expect(chunks[1].content).toBe('{"reasoning":');
      expect(chunks[2].type).toBe('token');
      expect(chunks[2].content).toBe('"test"}');
    });

    it('should emit an error chunk when Ollama returns non-ok status', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: false,
        statusText: 'Service Unavailable',
      } as unknown as Response);

      const result = await adapter.generateMutationStream([], mockMetrics);
      const reader = result.getReader();
      const chunks: Array<{ type: string; content: string }> = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      expect(chunks[0].type).toBe('status');
      expect(chunks[1].type).toBe('error');
      expect(chunks[1].content).toContain('Service Unavailable');
    });

    it('should emit an error chunk when response body is null', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: true,
        body: null,
      } as unknown as Response);

      const result = await adapter.generateMutationStream([], mockMetrics);
      const reader = result.getReader();
      const chunks: Array<{ type: string; content: string }> = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      expect(chunks[0].type).toBe('status');
      expect(chunks.some((c) => c.type === 'error')).toBe(true);
    });

    it('should handle abort signal and close gracefully', async () => {
      const abortController = new AbortController();
      const encoder = new TextEncoder();

      vi.mocked(globalThis.fetch).mockImplementationOnce(async (_url, init) => {
        abortController.abort();
        return {
          ok: true,
          body: new ReadableStream({
            start(controller) {
              controller.enqueue(encoder.encode(JSON.stringify({ response: 'partial', done: false })));
            },
          }),
        } as unknown as Response;
      });

      const result = await adapter.generateMutationStream([], mockMetrics, abortController.signal);
      const reader = result.getReader();
      const chunks: Array<{ type: string; content: string }> = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      expect(chunks.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle malformed JSON lines without throwing', async () => {
      const encoder = new TextEncoder();
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('not-json\n'));
          controller.enqueue(encoder.encode(JSON.stringify({ response: 'valid', done: true })));
          controller.close();
        },
      });

      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: true,
        body: mockStream,
      } as unknown as Response);

      const result = await adapter.generateMutationStream([], mockMetrics);
      const reader = result.getReader();
      const tokens: string[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value.type === 'token') tokens.push(value.content);
      }

      expect(tokens).toEqual(['valid']);
    });
  });
});
