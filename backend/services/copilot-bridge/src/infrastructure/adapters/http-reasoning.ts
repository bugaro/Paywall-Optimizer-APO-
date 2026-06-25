import type { ReasoningClient } from '../../application/ports.ts';
import type { TelemetryMetrics, ReasoningChunk } from '../../domain/types.ts';
import { correlationStorage } from '../context.ts';
import { logger } from '../logger.ts';
import { DEFAULT_MASTRA_AI_URL } from '../../domain/constants.ts';
import { InvalidOperationError } from '../../domain/errors.ts';
import { createRequestHeaders } from '../http-client.ts';
import client from 'prom-client';

export const downstreamStreamFailuresCounter = new client.Counter({
  name: 'downstream_stream_failures_total',
  help: 'Total number of failed downstream reasoning stream operations or parse exceptions',
});

export class HttpReasoningAdapter implements ReasoningClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.MASTRA_AI_URL || DEFAULT_MASTRA_AI_URL;
  }

  async generateMutationStream(
    appId: string,
    currentMetrics: TelemetryMetrics,
    signal?: AbortSignal
  ): Promise<ReadableStream<ReasoningChunk>> {
    const correlationId = correlationStorage.getStore()?.correlationId || '';
    logger.info(`Initiating downstream SSE reasoning stream for appId=${appId}, correlationId=${correlationId}`);

    const headers = createRequestHeaders();

    try {
      const response = await fetch(`${this.baseUrl}/api/reasoning/mutate/stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ appId, metrics: currentMetrics }),
        signal,
      });

      if (!response.ok) {
        downstreamStreamFailuresCounter.inc();
        logger.error(`Downstream reasoning SSE call failed with status ${response.status}`);
        throw new InvalidOperationError(`Downstream streaming call failed with status ${response.status}`);
      }

      const contentType = response.headers.get('Content-Type') || '';
      if (!contentType.includes('text/event-stream')) {
        downstreamStreamFailuresCounter.inc();
        logger.error(`Downstream SSE response content-type is invalid: ${contentType}`);
        throw new InvalidOperationError(`Expected text/event-stream response, got ${contentType}`);
      }

      logger.info(`Downstream stream connected: correlationId=${correlationId}`);

      const stream = new ReadableStream<ReasoningChunk>({
        start: async (controller) => {
          if (!response.body) {
            controller.close();
            return;
          }
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;

                if (trimmed.startsWith('data:')) {
                  const dataStr = trimmed.slice(5).trim();
                  try {
                    const chunk = JSON.parse(dataStr) as ReasoningChunk;
                    logger.info(`Downstream stream chunk processed: size=${dataStr.length}`);
                    controller.enqueue(chunk);
                  } catch (e) {
                    downstreamStreamFailuresCounter.inc();
                    logger.error(`Failed to parse downstream SSE chunk: ${dataStr}, error=${String(e)}`);
                  }
                }
              }
            }

            if (buffer.trim() && buffer.trim().startsWith('data:')) {
              const dataStr = buffer.trim().slice(5).trim();
              try {
                const chunk = JSON.parse(dataStr) as ReasoningChunk;
                controller.enqueue(chunk);
              } catch (e) {
                // Ignore final partial chunk errors
              }
            }

            controller.close();
          } catch (err: unknown) {
            downstreamStreamFailuresCounter.inc();
            logger.error(`Error reading downstream reasoning stream: ${err instanceof Error ? err.message : String(err)}`);
            controller.error(err);
          }
        }
      });

      return stream;
    } catch (err: unknown) {
      downstreamStreamFailuresCounter.inc();
      logger.error(`Failed to initiate downstream reasoning stream: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  }
}
