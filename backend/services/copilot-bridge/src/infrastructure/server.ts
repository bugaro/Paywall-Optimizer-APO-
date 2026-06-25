import './otel.ts';

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { v4 as uuidv4 } from 'uuid';
import client from 'prom-client';

import { correlationStorage } from './context.ts';
import { ValidationError, DomainError } from '../domain/errors.ts';
import { CORRELATION_ID_HEADER, DEFAULT_PORT } from '../domain/constants.ts';
import { logger } from './logger.ts';
import { createCopilotHonoHandler } from '@copilotkit/runtime/v2';
import { runtime } from './agent.ts';

// Setup Hono App
export const app = new Hono();

// CORS middleware
app.use('*', cors());

// Prometheus Metrics setup
client.collectDefaultMetrics();

const httpRequestsCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'],
});

const httpRequestDurationHistogram = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'status'],
});

app.use('*', async (c, next) => {
  const method = c.req.method;
  const path = c.req.path;
  const start = process.hrtime();

  await next();

  const status = String(c.res.status);
  const diff = process.hrtime(start);
  const duration = diff[0] + diff[1] / 1e9;

  httpRequestsCounter.inc({ method, path, status });
  httpRequestDurationHistogram.observe({ method, path, status }, duration);
});

// Correlation ID Middleware & Structured Logging
app.use('*', async (c, next) => {
  const correlationId = c.req.header(CORRELATION_ID_HEADER) || uuidv4();
  c.res.headers.set(CORRELATION_ID_HEADER, correlationId);

  return correlationStorage.run({ correlationId, signal: c.req.raw.signal }, async () => {
    logger.info(`Request received: ${c.req.method} ${c.req.path}`);
    await next();
  });
});

// Expose /metrics
app.get('/metrics', async (c) => {
  c.header('Content-Type', client.register.contentType);
  return c.text(await client.register.metrics(), 200);
});

// Intercept thread listing GET (frontend uses multi-route style even in single-route mode)
app.get('/copilot/chat/threads', async (c) => c.json([]));

// Expose CopilotKit route (single-route mode to match frontend JSON envelope format)
app.route('/', createCopilotHonoHandler({
  runtime,
  basePath: '/copilot/chat',
  mode: 'single-route',
}));

// Error handling
app.onError((err, c) => {
  if (err instanceof ValidationError) {
    return c.json({ error: err.message }, 400);
  }
  if (err instanceof DomainError) {
    // Map downstream errors to 503 Service Unavailable
    return c.json({ error: err.message }, 503);
  }
  logger.error(`Unhandled exception caught in HTTP controller: ${err.stack || err.message}`);
  return c.json({ error: 'Internal Server Error' }, 500);
});

// Server Bootstrap
if (process.env.NODE_ENV !== 'test') {
  const port = Number(process.env.PORT) || DEFAULT_PORT;
  serve(
    {
      fetch: app.fetch,
      port,
    },
    (info) => {
      logger.info(`Hono HTTP server listening on port ${info.port}`);
    }
  );
}
