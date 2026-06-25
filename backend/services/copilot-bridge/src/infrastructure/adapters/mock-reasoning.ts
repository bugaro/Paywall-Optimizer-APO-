import type { ReasoningPort } from '../../application/ports.ts';
import type { PaywallMutation, TelemetryMetrics, ReasoningChunk } from '../../domain/types.ts';
import { logger } from '../logger.ts';
import {
  APP_B_UUIDS,
  CONVERSION_RATE_BREACH_THRESHOLD,
} from '../../domain/constants.ts';

const MOCK_OPTIMIZED_MUTATION = {
  price: '$7.99',
  theme: 'dark-slate' as const,
  ctaCopy: 'Commit to your fitness today. Get 20% off forever.',
};

const MOCK_CONTROL_MUTATION = {
  price: '$9.99',
  theme: 'light' as const,
  ctaCopy: 'Start your free trial today.',
};

function buildMockMutation(appId: string, currentMetrics: TelemetryMetrics): PaywallMutation {
  if (
    (APP_B_UUIDS as readonly string[]).includes(appId) &&
    currentMetrics.conversionRate < CONVERSION_RATE_BREACH_THRESHOLD
  ) {
    return { ...MOCK_OPTIMIZED_MUTATION };
  }

  return { ...MOCK_CONTROL_MUTATION };
}

export class MockReasoningAdapter implements ReasoningPort {
  constructor() {
    logger.warn('Running in Mock Reasoning Mode — bypassing Mastra AI downstream requests.');
  }

  async generateMutationStream(
    appId: string,
    currentMetrics: TelemetryMetrics,
    _signal?: AbortSignal
  ): Promise<ReadableStream<ReasoningChunk>> {
    const mutation = buildMockMutation(appId, currentMetrics);
    return new ReadableStream<ReasoningChunk>({
      start(controller) {
        controller.enqueue({
          type: 'mutation_update',
          content: JSON.stringify(mutation),
          timestamp: Date.now(),
        });
        controller.close();
      },
    });
  }
}
