import type { EmbeddingPort } from '../../application/ports/llm.port.ts';
import type { PaywallHistoryEntry, TelemetryMetrics } from '../../domain/types.ts';
import { OLLAMA_DEFAULTS, PaywallTheme } from '../../domain/constants.ts';
import { ValidationError } from '../../domain/errors.ts';
import { logger } from '../logger.ts';
import { llmInferenceDurationHistogram, llmTokensCounter } from '../metrics.ts';

// ---------------------------------------------------------------------------
// Builds the user-turn prompt injected with grounding facts and live metrics.
// Separated for testability and to keep the adapter class focused.
// ---------------------------------------------------------------------------
export function buildGroundingPrompt(
  groundingFacts: PaywallHistoryEntry[],
  currentMetrics: TelemetryMetrics
): string {
  const factsSection =
    groundingFacts.length === 0
      ? 'No historical grounding facts available. Generate a zero-shot recommendation.'
      : groundingFacts
        .map(
          (fact, idx) => `
Fact ${idx + 1}:
- App ID: ${fact.appId}
- Failure Condition: "${fact.failureCondition}"
- Price Point: $${fact.pricePoint}
- Background Color: "${fact.backgroundColor}"
- Title Text: "${fact.titleText}"
- CTA Text: "${fact.ctaText}"
- Achieved Conversion Rate: ${(fact.conversionRate * 100).toFixed(2)}%`
        )
        .join('\n');

  return `Historical paywall mutations for grounding context:
${factsSection}
  
Current metrics for the app:
- Impressions: ${currentMetrics.impressions}
- Clicks: ${currentMetrics.clicks}
- Conversions: ${currentMetrics.conversions}
- Conversion Rate: ${(currentMetrics.conversionRate * 100).toFixed(2)}%
  
Suggest a high-impact recovery layout. Prefer the "${PaywallTheme.DarkSlate}" theme based on historical data.`;
}

// ---------------------------------------------------------------------------
// OllamaLlmAdapter
//
// Implements EmbeddingPort via raw Ollama /api/embeddings.
//
// Observability:
//   - llmInferenceDurationHistogram records per-call latency by model+operation
//   - llmTokensCounter records input token consumption per model
//   - Structured log objects ensure Loki can index fields
// ---------------------------------------------------------------------------
export class OllamaLlmAdapter implements EmbeddingPort {
  private readonly ollamaUrl: string;

  constructor() {
    this.ollamaUrl = process.env.OLLAMA_URL ?? OLLAMA_DEFAULTS.BASE_URL;
  }

  async getEmbedding(text: string): Promise<number[]> {
    logger.info({ model: OLLAMA_DEFAULTS.EMBEDDING_MODEL, operation: 'embedding' }, 'Requesting embedding from Ollama');

    const end = llmInferenceDurationHistogram.startTimer({
      model: OLLAMA_DEFAULTS.EMBEDDING_MODEL,
      operation: 'embedding',
    });

    try {
      const response = await fetch(`${this.ollamaUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_DEFAULTS.EMBEDDING_MODEL,
          prompt: text,
        }),
      });

      if (!response.ok) {
        throw new ValidationError(`Ollama embedding call failed: ${response.statusText}`);
      }

      const body = (await response.json()) as { embedding: number[]; prompt_eval_count?: number };
      if (!body.embedding || !Array.isArray(body.embedding)) {
        throw new ValidationError('Malformed embedding response from Ollama');
      }

      if (body.embedding.length !== OLLAMA_DEFAULTS.EMBEDDING_DIMENSION) {
        throw new ValidationError(
          `Invalid embedding size: expected ${OLLAMA_DEFAULTS.EMBEDDING_DIMENSION}, got ${body.embedding.length}`
        );
      }

      const inputTokens = body.prompt_eval_count ?? 0;
      if (inputTokens > 0) {
        llmTokensCounter.inc({ model: OLLAMA_DEFAULTS.EMBEDDING_MODEL, type: 'input' }, inputTokens);
      }

      const durationSeconds = end();
      logger.info({ model: OLLAMA_DEFAULTS.EMBEDDING_MODEL, durationMs: Math.round(durationSeconds * 1000), inputTokens }, 'Embedding inference succeeded');

      return body.embedding;
    } catch (error: unknown) {
      end();
      logger.error({ model: OLLAMA_DEFAULTS.EMBEDDING_MODEL, reason: error instanceof Error ? error.message : String(error) }, 'Embedding generation failed');
      throw error;
    }
  }
}
