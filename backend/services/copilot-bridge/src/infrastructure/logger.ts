import pino from 'pino';
import { trace } from '@opentelemetry/api';
import { correlationStorage } from './context.ts';
import { SERVICE_CONTEXT } from '../domain/constants.ts';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
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
      serviceContext: SERVICE_CONTEXT,
    };
  },
});
