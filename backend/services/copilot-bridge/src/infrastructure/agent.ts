import { z } from 'zod';
import client from 'prom-client';
import { createOpenAI } from '@ai-sdk/openai';
import { CopilotRuntime, BuiltInAgent, defineTool, InMemoryAgentRunner } from '@copilotkit/runtime/v2';

import { correlationStorage } from './context.ts';
import { HttpTelemetryAdapter } from './adapters/telemetry.ts';
import { MockReasoningAdapter } from './adapters/mock-reasoning.ts';
import { HttpReasoningAdapter } from './adapters/http-reasoning.ts';
import { ValidationError, InvalidOperationError } from '../domain/errors.ts';
import type { ReasoningPort } from '../application/ports.ts';
import {
  PAYWALL_THEMES,
  REMEDIATION_CARD_TYPE,
  AGENT_PROVIDERS,
  DEFAULT_OLLAMA_MODEL,
  DEFAULT_MASTRA_AI_URL,
} from '../domain/constants.ts';
import { logger } from './logger.ts';

export const copilotActiveStreams = new client.Gauge({
  name: 'copilot_active_streams',
  help: 'Number of concurrent active Copilot reasoning stream connections',
});

export const telemetryClient = new HttpTelemetryAdapter();
export let reasoningClient: ReasoningPort = process.env.MOCK_REASONING === 'true'
  ? new MockReasoningAdapter()
  : new HttpReasoningAdapter();

export function setReasoningClient(client: ReasoningPort) {
  reasoningClient = client;
}

export const initiateAbExperimentTool = defineTool({
  name: 'initiateAbExperiment',
  description: 'Initiate a new A/B split test with a paywall mutation for an app.',
  parameters: z.object({
    appId: z.string().describe('The UUID of the application.'),
    sampleSizePercent: z.number().describe('The percentage of users to target (between 0 and 100).'),
    mutation: z.object({
      price: z.string().describe('The price point, e.g. "$7.99"'),
      theme: z.enum([PAYWALL_THEMES.LIGHT, PAYWALL_THEMES.DARK_SLATE]).describe('The visual theme'),
      ctaCopy: z.string().describe('The call-to-action text'),
    }).describe('The paywall mutation details'),
  }),
  execute: async ({ appId, sampleSizePercent, mutation }) => {
    if (sampleSizePercent < 0 || sampleSizePercent > 100) {
      throw new ValidationError('sampleSizePercent must be between 0 and 100');
    }
    const success = await telemetryClient.initiateExperiment({ appId, sampleSizePercent, mutation });
    return { success };
  },
});

export const remediateBreachTool = defineTool({
  name: 'remediateBreach',
  description: 'Audit an app\'s performance and generate a paywall layout optimization proposal.',
  parameters: z.object({
    appId: z.string().describe('The UUID of the application to audit.'),
  }),
  execute: async ({ appId }) => {
    const correlationId = correlationStorage.getStore()?.correlationId || '';
    copilotActiveStreams.inc();

    const clientSignal = correlationStorage.getStore()?.signal;
    const abortController = new AbortController();

    const abortHandler = () => {
      logger.warn(`Frontend client aborted Copilot stream connection: correlationId=${correlationId}`);
      abortController.abort();
    };

    if (clientSignal) {
      clientSignal.addEventListener('abort', abortHandler);
    }

    try {
      const metrics = await telemetryClient.fetchMetrics(appId);

      const stream = await reasoningClient.generateMutationStream(appId, metrics, abortController.signal);
      const reader = stream.getReader();
      let mutationUpdateReceived = false;
      let price = '';
      let theme = '';
      let ctaCopy = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (value.type === 'mutation_update') {
          try {
            const update = JSON.parse(value.content);
            if (update.price) price = update.price;
            if (update.theme) theme = update.theme;
            if (update.ctaCopy) ctaCopy = update.ctaCopy;
            mutationUpdateReceived = true;
          } catch (e) {
            logger.error({ error: String(e), content: value.content }, 'Failed to parse mutation_update chunk');
          }
        }
      }

      if (!mutationUpdateReceived) {
        throw new InvalidOperationError('Stream completed without mutation_update — LLM output may have failed to parse');
      }

      const validatedTheme = Object.values(PAYWALL_THEMES).find(t => t === theme);
      if (!validatedTheme) {
        throw new InvalidOperationError(`LLM returned invalid theme: ${theme}`);
      }

      logger.info(`Copilot stream disconnected: status=success, correlationId=${correlationId}`);

      return {
        metrics,
        mutation: {
          price,
          theme: validatedTheme,
          ctaCopy,
        },
        cardType: REMEDIATION_CARD_TYPE,
      };
    } finally {
      copilotActiveStreams.dec();
      if (clientSignal) {
        clientSignal.removeEventListener('abort', abortHandler);
      }
    }
  },
});

export const resetSimulationTool = defineTool({
  name: 'resetSimulation',
  description: 'Reset the entire simulation — clears all telemetry data and A/B tests, then restarts the traffic simulator. Use when the user asks to clean up, reset, or start fresh.',
  parameters: z.object({}),
  execute: async () => {
    try {
      await telemetryClient.resetSimulation();
      return { success: true };
    } catch (err) {
      throw new InvalidOperationError(
        `Failed to reset simulation: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  },
});

export function resolveAgentModel() {
  const modelName = process.env.COPILOT_AGENT_MODEL || DEFAULT_OLLAMA_MODEL;
  const mastraUrl = process.env.MASTRA_AI_URL || DEFAULT_MASTRA_AI_URL;

  const cleanUrl = (mastraUrl || '').trim();
  const resolvedUrl = cleanUrl === '' ? DEFAULT_MASTRA_AI_URL : cleanUrl;
  if (cleanUrl === '') {
    logger.warn(`MASTRA_AI_URL is empty or malformed. Using fallback ${DEFAULT_MASTRA_AI_URL}`);
  }

  logger.info(`Copilot agent initialized with provider=ollama, model=${modelName}`);

  const openaiClient = createOpenAI({
    apiKey: AGENT_PROVIDERS.OLLAMA,
    baseURL: `${resolvedUrl}/api/reasoning/openai`,
  });
  return openaiClient.chat(modelName);
}

export const agent = new BuiltInAgent({
  model: resolveAgentModel(),
  tools: [initiateAbExperimentTool, remediateBreachTool, resetSimulationTool],
});

export const runtime = new CopilotRuntime({
  agents: {
    default: agent,
  },
  runner: new InMemoryAgentRunner(),
});
