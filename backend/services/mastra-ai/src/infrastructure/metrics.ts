import client from 'prom-client';

// ---------------------------------------------------------------------------
// Default Node.js runtime metrics (heap, GC, event loop lag)
// ---------------------------------------------------------------------------
client.collectDefaultMetrics();

// ---------------------------------------------------------------------------
// HTTP Layer Metrics
// ---------------------------------------------------------------------------

/**
 * Total HTTP requests by method, normalized route pattern, and status code.
 *
 * IMPORTANT: The `path` label uses a fixed route pattern constant (not the
 * raw URL) to prevent high-cardinality explosion in Prometheus when request
 * paths contain dynamic segments such as UUIDs or app IDs.
 */
export const httpRequestsCounter = new client.Counter({
  name: 'mastra_ai_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'] as const,
});

// ---------------------------------------------------------------------------
// LLM / AI-specific Metrics
// ---------------------------------------------------------------------------

/**
 * LLM inference latency histogram.
 * The `model` label records which Ollama model served the request so
 * per-model performance can be compared in dashboards.
 */
export const llmInferenceDurationHistogram = new client.Histogram({
  name: 'mastra_ai_llm_inference_duration_seconds',
  help: 'Latency of individual LLM inference calls (embedding or generation)',
  labelNames: ['model', 'operation'] as const,
  buckets: [0.1, 0.5, 1.0, 2.0, 3.0, 5.0, 8.0, 15.0],
});

/**
 * Cumulative token consumption counter.
 * The `type` label distinguishes `input` from `output` tokens.
 * The `model` label matches the Ollama model string.
 */
export const llmTokensCounter = new client.Counter({
  name: 'mastra_ai_llm_tokens_total',
  help: 'Total tokens consumed by LLM operations, split by type (input/output)',
  labelNames: ['model', 'type'] as const,
});

// ---------------------------------------------------------------------------
// Vector Store Metrics
// ---------------------------------------------------------------------------

export const vectorSearchDurationHistogram = new client.Histogram({
  name: 'mastra_ai_vector_search_duration_seconds',
  help: 'Latency of Drizzle pgvector similarity search queries',
  labelNames: [] as const,
  buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1.0],
});

// ---------------------------------------------------------------------------
export const ollamaStreamAbortsCounter = new client.Counter({
  name: 'ollama_stream_aborts_total',
  help: 'Total number of aborted Ollama streams',
});

export const mastraActiveSseStreams = new client.Gauge({
  name: 'mastra_active_sse_streams',
  help: 'Concurrent active SSE stream sessions',
});

export const downstreamFailuresCounter = new client.Counter({
  name: 'downstream_failures_total',
  help: 'Total number of failed downstream HTTP requests',
});

// ---------------------------------------------------------------------------
// Proposal Pipeline Metrics
// ---------------------------------------------------------------------------

export const proposalDurationHistogram = new client.Histogram({
  name: 'mastra_ai_proposal_duration_seconds',
  help: 'End-to-end latency of successful paywall mutation proposal generations',
  buckets: [1.0, 2.0, 3.0, 5.0, 7.5, 10.0, 15.0, 20.0, 30.0],
});

export const proposalFailuresCounter = new client.Counter({
  name: 'mastra_ai_proposal_failures_total',
  help: 'Total number of failed proposal generations',
  labelNames: ['reason'] as const,
});

// Re-export the registry for the /metrics endpoint
// ---------------------------------------------------------------------------
export { client as prometheusClient };
