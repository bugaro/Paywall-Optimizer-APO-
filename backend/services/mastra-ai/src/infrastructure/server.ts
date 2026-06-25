// ---------------------------------------------------------------------------
// OTel SDK MUST be the first import — it registers the global trace provider
// before any other module (Hono, Mastra, pino) loads and patches built-ins.
// ---------------------------------------------------------------------------
import './otel.ts';
import { Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { streamSSE } from 'hono/streaming';
import { v4 as uuidv4 } from 'uuid';
import { trace } from '@opentelemetry/api';
import { logger, correlationStorage } from './logger.ts';
import { prometheusClient, httpRequestsCounter, mastraActiveSseStreams, downstreamFailuresCounter, proposalDurationHistogram, proposalFailuresCounter } from './metrics.ts';
import { runMigrations } from './db/migrate.ts';
import { DrizzleVectorStoreAdapter } from './adapters/drizzle-vector-store.adapter.ts';
import { OllamaLlmAdapter } from './adapters/ollama-llm.adapter.ts';
import { OllamaStreamingAdapter } from './adapters/ollama-streaming.adapter.ts';
import { SERVER_DEFAULTS, SERVICE_NAME, CORRELATION_ID_HEADER, PROPOSAL_CONFIG, SSE_STATUS, OLLAMA_DEFAULTS, PaywallTheme } from '../domain/constants.ts';
import { AbHypothesisSchema, MutateRequestSchema, type PaywallHistoryEntry } from '../domain/types.ts';

// ---------------------------------------------------------------------------
// Route constants (used as `route` label in Prometheus to avoid cardinality
// explosion from dynamic path segments like UUIDs or app IDs)
// ---------------------------------------------------------------------------
const ROUTES = {
  HEALTH: '/health',
  METRICS: '/metrics',
  MUTATE_STREAM: '/api/reasoning/mutate/stream',
  OPENAI_PROXY: '/api/reasoning/openai',
} as const;

export const app = new Hono();

app.use('*', cors());

// ---------------------------------------------------------------------------
// Dependency wiring
// ---------------------------------------------------------------------------
const vectorStore = new DrizzleVectorStoreAdapter();
const ollamaLlm = new OllamaLlmAdapter();

// ---------------------------------------------------------------------------
// Middleware: Correlation context, structured logging, and HTTP metrics
//
// Context propagation strategy (W3C Trace Context precedence):
//   1. traceId / spanId — read from the active OTel span (set by the global
//      HttpInstrumentation which parses the incoming traceparent header).
//   2. correlationId  — read from X-Correlation-ID (legacy upstream services).
//   3. requestId      — read from x-request-id or generated fresh.
//   4. sessionId      — read from x-session-id if present.
//
// The correlationStorage.run() call stores this frame in AsyncLocalStorage so
// that every nested async log call (adapters, use-case) automatically inherits
// these identifiers without explicit parameter passing.
// ---------------------------------------------------------------------------
app.use('*', async (c, next) => {
  const incomingCorrelationId = c.req.header(CORRELATION_ID_HEADER);
  const correlationId = incomingCorrelationId ?? uuidv4();

  c.header(CORRELATION_ID_HEADER, correlationId);

  // Read W3C traceparent header for pre-existing distributed trace context
  const traceparent = c.req.header('traceparent');
  let headerTraceId: string | undefined;
  let headerSpanId: string | undefined;
  if (traceparent) {
    const parts = traceparent.split('-');
    if (parts.length === 4) {
      headerTraceId = parts[1];
      headerSpanId = parts[2];
    }
  }

  // The OTel HttpInstrumentation creates an active span for this request.
  // We read it here to get the canonical traceId — this will always be more
  // accurate than the raw header once the SDK has started.
  const activeSpan = trace.getActiveSpan();
  const spanCtx = activeSpan?.spanContext();

  const url = new URL(c.req.url);
  const isMutateStream = url.pathname.startsWith(ROUTES.MUTATE_STREAM);
  const correlationFrame = {
    correlationId,
    traceId: headerTraceId ?? spanCtx?.traceId ?? '',
    spanId: headerSpanId ?? spanCtx?.spanId ?? '',
    requestId: c.req.header('x-request-id') ?? correlationId,
    sessionId: c.req.header('x-session-id') ?? '',
    service: SERVICE_NAME,
    path: url.pathname,
    method: c.req.method,
    agentId: isMutateStream ? 'paywall-optimizer' : '',
  };

  return correlationStorage.run(correlationFrame, async () => {
    const startHr = process.hrtime();

    // Determine normalized route label for Prometheus
    const matchedRoute =
      (Object.values(ROUTES) as string[]).find((r) => c.req.path.startsWith(r)) ?? 'unknown';

    try {
      await next();
    } finally {
      const diff = process.hrtime(startHr);
      const durationMs = (diff[0] * 1000) + (diff[1] / 1e6);
      const statusCode = c.res.status;

      httpRequestsCounter.inc({
        method: c.req.method,
        route: matchedRoute,
        status: String(statusCode),
      });

      logger.info({
        durationMs: Math.round(durationMs),
        status: statusCode,
        ...correlationFrame,
      }, `HTTP ${c.req.method} ${url.pathname} -> ${statusCode} (${Math.round(durationMs)}ms)`);
    }
  });
});

// ---------------------------------------------------------------------------
// Readiness / Health Checks
// ---------------------------------------------------------------------------
app.get(ROUTES.HEALTH, (c) => {
  return c.json({ status: 'ok', service: SERVICE_NAME });
});

// ---------------------------------------------------------------------------
// Prometheus Metrics
// ---------------------------------------------------------------------------
app.get(ROUTES.METRICS, async (c) => {
  c.header('Content-Type', prometheusClient.register.contentType);
  return c.text(await prometheusClient.register.metrics());
});

// ---------------------------------------------------------------------------
// OpenAI-compatible proxy to Ollama
// ---------------------------------------------------------------------------
app.all(`${ROUTES.OPENAI_PROXY}/*`, async (c) => {
  const subpath = c.req.path.replace(ROUTES.OPENAI_PROXY, '');
  const ollamaUrl = process.env.OLLAMA_URL || OLLAMA_DEFAULTS.BASE_URL;
  const targetUrl = `${ollamaUrl}/v1${subpath}${new URL(c.req.url).search}`;

  logger.info(`Proxying OpenAI request from subpath ${subpath} to Ollama`);

  const headers = new Headers();
  for (const [key, value] of Object.entries(c.req.header())) {
    if (key.toLowerCase() !== 'host') {
      headers.set(key, value);
    }
  }

  const correlationId = correlationStorage.getStore()?.correlationId;
  if (correlationId && !headers.has(CORRELATION_ID_HEADER)) {
    headers.set(CORRELATION_ID_HEADER, correlationId);
  }

  try {
    const response = await fetch(targetUrl, {
      method: c.req.method,
      headers,
      body: c.req.method !== 'GET' && c.req.method !== 'HEAD' ? await c.req.arrayBuffer() : undefined,
    });

    if (!response.ok) {
      downstreamFailuresCounter.inc();
    }

    for (const [key, value] of response.headers.entries()) {
      c.header(key, value);
    }

    if (response.body) {
      return c.body(response.body, response.status as ContentfulStatusCode);
    }
    return c.body(await response.arrayBuffer(), response.status as ContentfulStatusCode);
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Proxy request to Ollama failed');
    downstreamFailuresCounter.inc();
    return c.json({ error: 'Ollama downstream service is unavailable' }, 503);
  }
});

// ---------------------------------------------------------------------------
// SSE streaming reasoning endpoint
// ---------------------------------------------------------------------------
app.post(ROUTES.MUTATE_STREAM, async (c) => {
  const rawBody: unknown = await c.req.json().catch(() => null);
  const parsed = MutateRequestSchema.safeParse(rawBody);

  if (!parsed.success) {
    proposalFailuresCounter.inc({ reason: 'invalid_request_body' });
    return c.json({ error: 'Invalid request body', details: parsed.error.flatten() }, 400);
  }

  const { appId, metrics } = parsed.data;
  const correlationId = c.req.header(CORRELATION_ID_HEADER) ?? '';

  logger.info({ correlationId, appId }, `SSE stream start: correlationId=${correlationId}`);
  mastraActiveSseStreams.inc();

  const startProposalHr = process.hrtime();

  const controller = new AbortController();
  c.req.raw.signal.addEventListener('abort', () => {
    controller.abort();
  });

  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');

  return streamSSE(c, async (sse) => {
    try {
      await sse.writeSSE({
        data: JSON.stringify({
          type: 'status',
          content: SSE_STATUS.FETCHING_VECTOR_STORE,
          timestamp: Date.now(),
        }),
      });

      let groundingFacts: PaywallHistoryEntry[] = [];
      try {
        const failureText = `App ID ${appId} conversion rate is ${(metrics.conversionRate * 100).toFixed(2)}%, breaching ${(PROPOSAL_CONFIG.CONVERSION_RATE_THRESHOLD * 100).toFixed(0)}% threshold. Impressions: ${metrics.impressions}, conversions: ${metrics.conversions}.`;
        const embedding = await ollamaLlm.getEmbedding(failureText);
        groundingFacts = await vectorStore.findSimilarMutations(embedding, PROPOSAL_CONFIG.RAG_TOP_K);
      } catch (dbError) {
        logger.warn({ reason: String(dbError) }, 'RAG phase failed; continuing zero-shot stream');
      }

      const textStream = await new OllamaStreamingAdapter().generateMutationStream(groundingFacts, metrics, controller.signal);
      const reader = textStream.getReader();
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (value.type === 'token') {
          accumulatedText += value.content;
        }

        await sse.writeSSE({
          data: JSON.stringify(value),
        });
      }

      // After token stream completes, parse the full output and emit mutation_update
      if (accumulatedText.trim()) {
        try {
          const raw = JSON.parse(accumulatedText);
          const parsed = AbHypothesisSchema.safeParse(raw);
          if (parsed.success) {
            const { proposedUi } = parsed.data;
            const mutation = {
              price: `$${proposedUi.pricePoint.toFixed(2)}`,
              theme: proposedUi.backgroundColor === PaywallTheme.Light ? PaywallTheme.Light : PaywallTheme.DarkSlate,
              ctaCopy: `${proposedUi.titleText} ${proposedUi.ctaText}`.trim(),
            };
            await sse.writeSSE({
              data: JSON.stringify({
                type: 'mutation_update',
                content: JSON.stringify(mutation),
                timestamp: Date.now(),
              }),
            });

            // Record successful proposal generation latency!
            const diff = process.hrtime(startProposalHr);
            const durationSec = diff[0] + diff[1] / 1e9;
            proposalDurationHistogram.observe(durationSec);
          } else {
            proposalFailuresCounter.inc({ reason: 'validation_error' });
            logger.error({ errors: parsed.error.format() }, 'Streamed output failed AbHypothesisSchema validation');
            await sse.writeSSE({
              data: JSON.stringify({
                type: 'error',
                content: `LLM output schema validation failed: ${parsed.error.message}`,
                timestamp: Date.now(),
              }),
            });
          }
        } catch (parseErr: unknown) {
          proposalFailuresCounter.inc({ reason: 'parse_error' });
          const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
          logger.error({ accumulatedText, error: msg }, 'Failed to parse streamed LLM output as JSON');
          await sse.writeSSE({
            data: JSON.stringify({
              type: 'error',
              content: `Failed to parse LLM output: ${msg}`,
              timestamp: Date.now(),
            }),
          });
        }
      } else {
        proposalFailuresCounter.inc({ reason: 'empty_response' });
        logger.error('Ollama stream completed with empty response');
        await sse.writeSSE({
          data: JSON.stringify({
            type: 'error',
            content: 'Ollama stream completed with empty response',
            timestamp: Date.now(),
          }),
        });
      }
    } catch (err: unknown) {
      const isAbort = err instanceof Error && (err.name === 'AbortError' || err.message.includes('aborted'));
      proposalFailuresCounter.inc({ reason: isAbort ? 'client_aborted' : 'stream_error' });
      logger.error({ error: err instanceof Error ? err.message : String(err) }, 'Error in Hono SSE stream endpoint');
      await sse.writeSSE({
        data: JSON.stringify({
          type: 'error',
          content: err instanceof Error ? err.message : String(err),
          timestamp: Date.now(),
        }),
      });
    } finally {
      logger.info({ correlationId }, `SSE stream end: correlationId=${correlationId}`);
      mastraActiveSseStreams.dec();
    }
  });
});

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
import { db } from './db/index.ts';
import { paywallHistory } from './db/schema.ts';
import { runSeeder } from './db/seed.ts';

const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith('server.ts') ||
    process.argv[1].endsWith('server.js') ||
    process.argv[1].endsWith('server'));

if (isDirectRun && process.env.NODE_ENV !== 'test') {
  runMigrations()
    .then(async () => {
      try {
        const existing = await db.select().from(paywallHistory).limit(1);
        if (existing.length === 0) {
          logger.info('Database is empty, triggering automatic seeding...');
          await runSeeder();
        } else {
          logger.info('Database already contains records. Skipping automatic seeding.');
        }
      } catch (seedErr) {
        logger.error({ reason: String(seedErr) }, 'Automatic seeding failed');
      }

      const port = Number(process.env.PORT ?? SERVER_DEFAULTS.PORT);
      serve({ fetch: app.fetch, port }, (info) => {
        logger.info({ port: info.port, service: SERVICE_NAME }, 'Mastra AI Service started');
      });
    })
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ reason: message }, 'Failed to boot Mastra AI Service');
      process.exit(1);
    });
}
