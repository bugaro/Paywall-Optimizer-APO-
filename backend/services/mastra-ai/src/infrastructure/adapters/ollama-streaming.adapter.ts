import type { PaywallHistoryEntry, TelemetryMetrics, ReasoningChunk } from '../../domain/types.ts';
import { OLLAMA_DEFAULTS, AGENT_INSTRUCTIONS, SSE_STATUS } from '../../domain/constants.ts';
import { InvalidOperationError } from '../../domain/errors.ts';
import { buildGroundingPrompt } from './ollama-llm.adapter.ts';
import { logger } from '../logger.ts';
import { ollamaStreamAbortsCounter, llmInferenceDurationHistogram, llmTokensCounter } from '../metrics.ts';

export class OllamaStreamingAdapter {
  private readonly ollamaUrl: string;

  constructor() {
    this.ollamaUrl = process.env.OLLAMA_URL ?? OLLAMA_DEFAULTS.BASE_URL;
  }

  async generateMutationStream(
    groundingFacts: PaywallHistoryEntry[],
    currentMetrics: TelemetryMetrics,
    signal?: AbortSignal
  ): Promise<ReadableStream<ReasoningChunk>> {
    const prompt = buildGroundingPrompt(groundingFacts, currentMetrics);
    
    const stream = new ReadableStream<ReasoningChunk>({
      start: async (controller) => {
        logger.info({ model: OLLAMA_DEFAULTS.GENERATION_MODEL, operation: 'streaming_generation' }, 'Ollama token stream initiated');
        
        controller.enqueue({
          type: 'status',
          content: SSE_STATUS.QUERYING_OLLAMA,
          timestamp: Date.now(),
        });

        const startHrTime = process.hrtime();
        const endTimer = llmInferenceDurationHistogram.startTimer({
          model: OLLAMA_DEFAULTS.GENERATION_MODEL,
          operation: 'streaming_generation',
        });

        const abortHandler = () => {
          logger.warn({ model: OLLAMA_DEFAULTS.GENERATION_MODEL }, 'Ollama stream request aborted by client');
          ollamaStreamAbortsCounter.inc();
          controller.enqueue({
            type: 'error',
            content: 'Stream aborted by client',
            timestamp: Date.now(),
          });
          controller.close();
        };

        if (signal) {
          signal.addEventListener('abort', abortHandler);
        }

        try {
          const response = await fetch(`${this.ollamaUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: OLLAMA_DEFAULTS.GENERATION_MODEL,
              prompt: prompt,
              system: AGENT_INSTRUCTIONS,
              format: 'json',
              stream: true,
            }),
            signal,
          });

          if (!response.ok) {
            throw new InvalidOperationError(`Ollama stream request failed: ${response.statusText}`);
          }

          if (!response.body) {
            throw new InvalidOperationError('Ollama response body is empty');
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let lastDoneInfo: { prompt_eval_count?: number; eval_count?: number } | null = null;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.trim() === '') continue;
              try {
                const parsed = JSON.parse(line);
                if (parsed.done) {
                  lastDoneInfo = parsed;
                }
                if (parsed.response) {
                  controller.enqueue({
                    type: 'token',
                    content: parsed.response,
                    timestamp: Date.now(),
                  });
                }
              } catch (e) {
                logger.error({ line, error: String(e) }, 'Failed to parse Ollama stream line');
              }
            }
          }

          if (buffer.trim() !== '') {
            try {
              const parsed = JSON.parse(buffer);
              if (parsed.done) {
                lastDoneInfo = parsed;
              }
              if (parsed.response) {
                controller.enqueue({
                  type: 'token',
                  content: parsed.response,
                  timestamp: Date.now(),
                });
              }
            } catch (e) {
              // Ignore incomplete final chunk parse errors
            }
          }

          if (lastDoneInfo) {
            logger.debug({ lastDoneInfo }, 'Ollama stream done line metadata');
            const inputTokens = lastDoneInfo.prompt_eval_count ?? 0;
            const outputTokens = lastDoneInfo.eval_count ?? 0;
            if (inputTokens > 0) {
              llmTokensCounter.inc({ model: OLLAMA_DEFAULTS.GENERATION_MODEL, type: 'input' }, inputTokens);
            }
            if (outputTokens > 0) {
              llmTokensCounter.inc({ model: OLLAMA_DEFAULTS.GENERATION_MODEL, type: 'output' }, outputTokens);
            }
          }

          const diff = process.hrtime(startHrTime);
          const durationMs = Math.round(diff[0] * 1000 + diff[1] / 1e6);
          logger.info({ model: OLLAMA_DEFAULTS.GENERATION_MODEL, durationMs }, 'Ollama token stream completed successfully');
          endTimer();
          
          controller.close();
        } catch (error: unknown) {
          endTimer();
          if (error instanceof Error && error.name === 'AbortError') {
            return;
          }
          const message = error instanceof Error ? error.message : String(error);
          logger.error({ model: OLLAMA_DEFAULTS.GENERATION_MODEL, error: message }, 'Error during Ollama token streaming');
          controller.enqueue({
            type: 'error',
            content: `Ollama stream error: ${message}`,
            timestamp: Date.now(),
          });
          controller.close();
        } finally {
          if (signal) {
            signal.removeEventListener('abort', abortHandler);
          }
        }
      }
    });

    return stream;
  }
}
