import { correlationStorage } from './context.ts';
import { propagation, context } from '@opentelemetry/api';
import { CONTENT_TYPE_JSON, CORRELATION_ID_HEADER, DOWNSTREAM_TIMEOUT_MS } from '../domain/constants.ts';
import { InvalidOperationError } from '../domain/errors.ts';
import client from 'prom-client';

export const downstreamFailuresCounter = new client.Counter({
  name: 'downstream_failures_total',
  help: 'Total number of failed downstream HTTP requests',
});

export function createRequestHeaders(): Record<string, string> {
  const correlationId = correlationStorage.getStore()?.correlationId || '';
  const headers: Record<string, string> = {
    'Content-Type': CONTENT_TYPE_JSON,
    [CORRELATION_ID_HEADER]: correlationId,
  };
  propagation.inject(context.active(), headers);
  return headers;
}

export function withTimeout(ms: number = DOWNSTREAM_TIMEOUT_MS): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timeoutId),
  };
}

export async function httpFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const { signal, cleanup } = withTimeout();
  const headers = { ...createRequestHeaders(), ...(options.headers as Record<string, string> || {}) };

  try {
    const response = await fetch(url, { ...options, headers, signal });

    if (!response.ok) {
      downstreamFailuresCounter.inc();
      throw new InvalidOperationError(`Downstream call failed with status ${response.status}`, {
        statusCode: response.status,
      });
    }

    return (await response.json()) as T;
  } catch (error: unknown) {
    if (error instanceof InvalidOperationError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      downstreamFailuresCounter.inc();
      throw new InvalidOperationError('Downstream call timed out');
    }
    downstreamFailuresCounter.inc();
    throw new InvalidOperationError(error instanceof Error ? error.message : String(error));
  } finally {
    cleanup();
  }
}
