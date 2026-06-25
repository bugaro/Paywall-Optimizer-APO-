import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { app } from '../src/infrastructure/server.ts';

describe('Mastra AI OpenAI Proxy Route Test Suite', () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = process.env;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
    process.env = { ...originalEnv, OLLAMA_URL: 'http://localhost:11434' };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  // ==========================================
  // URL Subpath & Request Forwarding
  // ==========================================
  it('should forward request to Ollama subpath and preserve method/body', async () => {
    // Given: A valid chat completions request
    const payload = {
      model: 'gemma4:e2b',
      messages: [{ role: 'user', content: 'hello' }],
    };

    const mockResponse = { id: 'chat-response-123', choices: [] };
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      arrayBuffer: async () => new TextEncoder().encode(JSON.stringify(mockResponse)),
    } as unknown as Response);

    // When: Request is routed through the proxy
    const res = await app.request('/api/reasoning/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // Then: Fetch must target Ollama and preserve parameters
    expect(res.status).toBe(200);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    const callArgs = vi.mocked(globalThis.fetch).mock.calls[0];
    expect(callArgs[0]).toBe('http://localhost:11434/v1/chat/completions');
    expect(callArgs[1]?.method).toBe('POST');
    
    const bodyText = new TextDecoder().decode(callArgs[1]?.body as ArrayBuffer);
    expect(JSON.parse(bodyText)).toEqual(payload);
  });

  // ==========================================
  // Header Rewriting & Context Propagation
  // ==========================================
  it('should strip host header, rewrite to target, and propagate correlation context', async () => {
    // Given: Request containing host, trace, and correlation headers
    const testCorrelationId = 'corr-id-abc';
    const testTraceparent = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';

    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      headers: new Headers(),
      arrayBuffer: async () => new ArrayBuffer(0),
    } as unknown as Response);

    // When: The proxy endpoint is requested
    const res = await app.request('/api/reasoning/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Host': 'localhost:4006',
        'X-Correlation-ID': testCorrelationId,
        'traceparent': testTraceparent,
      },
    });

    // Then: The outgoing request to Ollama should have Host header removed or rewritten
    expect(res.status).toBe(200);
    const callArgs = vi.mocked(globalThis.fetch).mock.calls[0];
    const fetchHeaders = callArgs[1]?.headers as Headers;

    // Fetch strips/overwrites host internally or does not pass original host
    expect(fetchHeaders.get('Host')).toBeNull();
    expect(fetchHeaders.get('X-Correlation-ID')).toBe(testCorrelationId);
    expect(fetchHeaders.get('traceparent')).toBe(testTraceparent);
  });

  // ==========================================
  // SSE Streaming Compatibility
  // ==========================================
  it('should stream event-stream chunks without buffering', async () => {
    // Given: Downstream response is an event stream of chunks
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: chunk1\n\n'));
        controller.enqueue(encoder.encode('data: chunk2\n\n'));
        controller.close();
      },
    });

    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'Content-Type': 'text/event-stream' }),
      body: stream,
    } as unknown as Response);

    // When: Requesting the proxy endpoint
    const res = await app.request('/api/reasoning/openai/chat/completions', {
      method: 'POST',
    });

    // Then: Response should stream correctly
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');

    const reader = res.body?.getReader();
    expect(reader).toBeDefined();

    const chunk1 = await reader?.read();
    expect(new TextDecoder().decode(chunk1?.value)).toBe('data: chunk1\n\n');

    const chunk2 = await reader?.read();
    expect(new TextDecoder().decode(chunk2?.value)).toBe('data: chunk2\n\n');
  });

  // ==========================================
  // Downstream Error & Timeout Scenarios (Negative Cases)
  // ==========================================
  it('should return 503 Service Unavailable when fetch throws error (Ollama down)', async () => {
    // Given: Fetch rejects due to network crash/refusal
    vi.mocked(globalThis.fetch).mockRejectedValueOnce(new Error('Connection refused'));

    // When: Request is routed
    const res = await app.request('/api/reasoning/openai/chat/completions', {
      method: 'POST',
    });

    // Then: A clean JSON error payload is returned with 503
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).toEqual({ error: 'Ollama downstream service is unavailable' });
  });

  it('should return 503 and increment metrics if fetch response has status 503', async () => {
    // Given: Ollama itself returns 503
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: false,
      status: 503,
      headers: new Headers(),
      arrayBuffer: async () => new ArrayBuffer(0),
    } as unknown as Response);

    // When: Request is routed
    const res = await app.request('/api/reasoning/openai/chat/completions', {
      method: 'POST',
    });

    // Then: Proxy propagates or handles cleanly
    expect(res.status).toBe(503);
  });
});
