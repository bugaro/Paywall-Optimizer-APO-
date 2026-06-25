import '../otel.ts';

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { AsyncLocalStorage } from 'async_hooks';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import client from 'prom-client';
import { trace } from '@opentelemetry/api';

import {
  ValidationError,
  NotFoundError,
  ConflictError,
  AuthorizationError,
  InvalidOperationError,
} from '../../domain/errors.ts';
import { evaluateSegment } from '../../domain/segmentation.ts';
import { MetricsAggregator } from '../../application/use-cases/metrics-aggregator.ts';
import { db, abTestRepository, telemetryRepository, userRepository, setLogger } from '../db/index.ts';
import { seedDatabaseIfEmpty } from '../db/seed.ts';
import { applications, telemetryEvents, abTests } from '../db/schema.ts';
import type { TelemetryEvent, Variant } from '../../domain/entities.ts';
import { TELEMETRY_EVENT_TYPES } from '../../domain/entities.ts';
import { TrafficSimulator } from '../simulator/traffic-simulator.ts';

const DEFAULT_PORT = 4003;
const ONE_HOUR_MS = 3600 * 1000;

interface EventPayload {
  userId: string;
  appId: string;
  eventType: string;
}

function isEventPayload(obj: unknown): obj is EventPayload {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'userId' in obj &&
    'appId' in obj &&
    'eventType' in obj &&
    typeof (obj as Record<string, unknown>).userId === 'string' &&
    typeof (obj as Record<string, unknown>).appId === 'string' &&
    typeof (obj as Record<string, unknown>).eventType === 'string'
  );
}


export const correlationStorage = new AsyncLocalStorage<{ correlationId: string }>();

export const logger = pino({
  level: 'info',
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
  },
  mixin() {
    const store = correlationStorage.getStore();
    const activeSpan = trace.getActiveSpan();
    const spanContext = activeSpan?.spanContext();

    return {
      correlationId: store?.correlationId || '',
      traceId: spanContext?.traceId || '',
      spanId: spanContext?.spanId || '',
      serviceContext: 'telemetry-analytics',
    };
  },
});

export const app = new Hono();

app.use('*', cors());

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

app.use('*', async (c, next) => {
  const correlationId = c.req.header('X-Correlation-ID') || uuidv4();
  c.res.headers.set('X-Correlation-ID', correlationId);

  return correlationStorage.run({ correlationId }, async () => {
    logger.info(`Request received: ${c.req.method} ${c.req.path}`);
    await next();
  });
});

export let simulator: TrafficSimulator | null = null;

let _metricsAggregator: MetricsAggregator | undefined;

export function setMetricsAggregator(instance: MetricsAggregator): void {
  _metricsAggregator = instance;
}

function getMetricsAggregator(): MetricsAggregator {
  if (!_metricsAggregator) {
    _metricsAggregator = new MetricsAggregator(telemetryRepository, logger);
  }
  return _metricsAggregator;
}

// 5. Error Handler Mapping
app.onError((err, c) => {
  if (err instanceof ValidationError || err instanceof InvalidOperationError) {
    return c.json({ error: err.message }, 400);
  }
  if (err instanceof NotFoundError) {
    return c.json({ error: err.message }, 404);
  }
  if (err instanceof ConflictError) {
    return c.json({ error: err.message }, 409);
  }
  if (err instanceof AuthorizationError) {
    return c.json({ error: err.message }, 403);
  }

  logger.error(`Unhandled exception caught in HTTP controller: ${err.stack || err.message}`);
  return c.json({ error: 'Internal Server Error' }, 500);
});

// UUID Validation Helper
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUuid(id: string): boolean {
  return uuidRegex.test(id);
}

// 6. Routes Setup
app.post('/api/events', async (c) => {
  const body = (await c.req.json()) as unknown;

  if (!isEventPayload(body)) {
    return c.json({ error: 'Invalid payload structure' }, 400);
  }

  const { userId, appId, eventType } = body;

  if (!isValidUuid(userId) || !isValidUuid(appId)) {
    return c.json({ error: 'Invalid payload' }, 400);
  }

  if (
    eventType !== TELEMETRY_EVENT_TYPES.IMPRESSION &&
    eventType !== TELEMETRY_EVENT_TYPES.CLICK &&
    eventType !== TELEMETRY_EVENT_TYPES.PURCHASE
  ) {
    return c.json({ error: 'Invalid event type' }, 400);
  }

  // Business Logic
  const activeTest = await abTestRepository.getActiveByAppId(appId);
  let variant: Variant = 'A';

  if (activeTest && activeTest.isActive && activeTest.status === 'running') {
    variant = evaluateSegment(userId, activeTest.name || activeTest.id, activeTest.sampleSizePercent);
  }

  getMetricsAggregator().pushEvent({
    userId,
    appId,
    eventType,
    variant,
    timestamp: new Date(),
  });

  if (eventType === TELEMETRY_EVENT_TYPES.PURCHASE) {
    await userRepository.updateSubscription(userId, appId, true);
  }

  return c.json({ success: true, variant }, 202);
});

app.post('/api/experiments', async (c) => {
  const body = (await c.req.json()) as Record<string, unknown>;
  const appId = body.appId;
  const name = body.name;
  const sampleSizePercent = body.sampleSizePercent;

  if (typeof appId !== 'string' || !isValidUuid(appId)) {
    return c.json({ error: 'appId is required and must be a valid UUID' }, 400);
  }

  if (typeof name !== 'string' || name.trim() === '') {
    return c.json({ error: 'name is required and must be a non-empty string' }, 400);
  }

  if (typeof sampleSizePercent !== 'number' || sampleSizePercent < 0 || sampleSizePercent > 100) {
    return c.json({ error: 'sampleSizePercent must be a number between 0 and 100' }, 400);
  }

  const experiment = await abTestRepository.createActive(appId, name, sampleSizePercent);
  return c.json(experiment, 201);
});

app.get('/api/experiments/active', async (c) => {
  const appId = c.req.query('appId');

  if (!appId || !isValidUuid(appId)) {
    return c.json({ error: 'appId is required and must be a valid UUID' }, 400);
  }

  const experiment = await abTestRepository.getActiveByAppId(appId);
  return c.json(experiment, 200);
});

app.get('/api/metrics', async (c) => {
  const appId = c.req.query('appId');
  const sinceStr = c.req.query('since');

  if (!appId || !isValidUuid(appId)) {
    return c.json({ error: 'appId is required and must be a valid UUID' }, 400);
  }

  let since = new Date(Date.now() - ONE_HOUR_MS); // Default to last 1 hour
  if (sinceStr) {
    since = new Date(sinceStr);
    if (isNaN(since.getTime())) {
      return c.json({ error: 'since parameter is invalid' }, 400);
    }
  }

  const metrics = await telemetryRepository.getAggregatedMetrics(appId, since);
  return c.json(metrics, 200);
});

app.get('/api/applications', async (c) => {
  const apps = await db.select().from(applications);
  return c.json(apps, 200);
});

app.get('/metrics', async (c) => {
  c.header('Content-Type', client.register.contentType);
  return c.text(await client.register.metrics(), 200);
});

app.post('/api/reset', async (c) => {
  logger.info('Reset requested — clearing simulation state');

  if (simulator && simulator.isRunning()) {
    simulator.stop();
    logger.info('Simulator stopped');
  }

  await db.delete(telemetryEvents);
  await db.delete(abTests);
  logger.info('Telemetry events and A/B tests cleared');

  if (simulator) {
    await simulator.initialize();
    simulator.start();
    logger.info('Simulator re-initialized and restarted');
  }

  return c.json({ success: true }, 200);
});

// 7. Server Bootstrap
if (process.env.NODE_ENV !== 'test') {
  const port = Number(process.env.PORT) || DEFAULT_PORT;
  serve(
    {
      fetch: app.fetch,
      port,
    },
    async (info) => {
      logger.info(`Hono HTTP server listening on port ${info.port}`);

      setLogger(logger);

      try {
        await seedDatabaseIfEmpty(db, logger);
        logger.info('Database seeded successfully.');
      } catch (err) {
        logger.error(`Database seeding failed: ${err instanceof Error ? err.message : String(err)}`);
      }

      if (process.env.START_SIMULATOR !== 'false') {
        try {
          simulator = new TrafficSimulator(
            userRepository,
            abTestRepository,
            getMetricsAggregator(),
            logger
          );
          await simulator.initialize();
          simulator.start();
          logger.info('Traffic simulator initialized and started successfully.');
        } catch (err) {
          logger.error(`Failed to start traffic simulator: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
  );
}
