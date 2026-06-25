import { AsyncLocalStorage } from 'node:async_hooks';
import pino from 'pino';
import { trace } from '@opentelemetry/api';
import { SERVICE_NAME } from '../domain/constants.ts';

// ---------------------------------------------------------------------------
// Request Context
//
// Stored in AsyncLocalStorage for the lifetime of a single HTTP request.
// Populated by the Hono correlation middleware in server.ts.
// ---------------------------------------------------------------------------
export interface RequestContext {
  /** W3C Trace Context trace ID (populated from OTel active span or traceparent header) */
  traceId?: string;
  /** W3C Trace Context span ID (populated from OTel active span) */
  spanId?: string;
  /** Legacy correlation ID — kept for backward compatibility with upstream services */
  correlationId: string;
  /** Unique per-request ID (from x-request-id header or generated uuid) */
  requestId: string;
  /** Authenticated user session identifier */
  sessionId?: string;
  /** Authenticated user identifier */
  userId?: string;
  /** Mastra agent identifier handling this request */
  agentId?: string;
}

// ---------------------------------------------------------------------------
// Async Context Storage
// ---------------------------------------------------------------------------
export const correlationStorage = new AsyncLocalStorage<RequestContext>();

// ---------------------------------------------------------------------------
// Pino Mixin
//
// Executed synchronously on every log call. Reads the active OTel span first
// (populated by OTel instrumentation), then falls back to the stored context.
// This ensures traceId/spanId are always in sync with OTel — even inside
// auto-instrumented async paths that bypass the manual middleware.
// ---------------------------------------------------------------------------
function getContextBindings(): Record<string, string> {
  const store = correlationStorage.getStore();

  // Prefer the live OTel span context (authoritative source of trace identity)
  const activeSpan = trace.getActiveSpan();
  const spanContext = activeSpan?.spanContext();

  const traceId = spanContext?.traceId || store?.traceId || '';
  const spanId = spanContext?.spanId || store?.spanId || '';

  return {
    traceId,
    spanId,
    correlationId: store?.correlationId ?? '',
    requestId: store?.requestId ?? '',
    sessionId: store?.sessionId ?? '',
    userId: store?.userId ?? '',
    agentId: store?.agentId ?? '',
  };
}

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------
export const logger = pino({
  name: SERVICE_NAME,
  level: process.env.LOG_LEVEL ?? 'info',
  mixin: getContextBindings,
  // Redact sensitive fields anywhere in the logged JSON tree
  redact: {
    paths: [
      'password',
      'secret',
      'token',
      'apiKey',
      'api_key',
      'authorization',
      'Authorization',
      '*.password',
      '*.secret',
      '*.token',
      '*.apiKey',
      '*.api_key',
    ],
    censor: '[REDACTED]',
  },
  formatters: {
    // Use uppercase level strings so Alloy stage.drop can match 'DEBUG'
    level(label) {
      return { level: label.toUpperCase() };
    },
  },
});
