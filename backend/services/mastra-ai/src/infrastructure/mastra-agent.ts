import { Agent } from '@mastra/core/agent';
import { Mastra } from '@mastra/core';
import { Observability } from '@mastra/observability';
import { OtelBridge } from '@mastra/otel-bridge';
import { AGENT_INSTRUCTIONS, OLLAMA_DEFAULTS, SERVICE_NAME } from '../domain/constants.ts';

// ---------------------------------------------------------------------------
// Paywall Optimizer Agent
//
// A Mastra Agent backed by a local Ollama.
// Model routing is done via the Mastra model router:
//   - Model string format: 'ollama/<model-name>'
//   - Base URL read from process.env.OLLAMA_BASE_URL (default: http://localhost:11434)
//
// The agent is registered with a Mastra instance that has telemetry enabled.
// This causes Agent.generate() to emit OpenTelemetry spans for each inference
// call, which are then forwarded to Grafana Alloy via the global OTel SDK
// (initialized in otel.ts before this module is loaded).
// ---------------------------------------------------------------------------

process.env.OLLAMA_CLOUD_BASE_URL = `${process.env.OLLAMA_URL || OLLAMA_DEFAULTS.BASE_URL}/v1`;
process.env.OLLAMA_API_KEY = process.env.OLLAMA_API_KEY || 'ollama';

export const paywallOptimizerAgent = new Agent({
  id: 'paywall-optimizer',
  name: 'Paywall Optimizer Agent',
  instructions: AGENT_INSTRUCTIONS,
  model: {
    providerId: 'ollama-cloud',
    modelId: OLLAMA_DEFAULTS.GENERATION_MODEL,
    url: `${process.env.OLLAMA_URL || OLLAMA_DEFAULTS.BASE_URL}/v1`,
    apiKey: 'ollama',
  },
});

// Register the agent with a Mastra instance with native OTel bridging enabled.
// This allows Mastra internal spans (agent, tools) to automatically nest as
// child spans of the ambient HTTP request spans managed by Hono/NodeSDK.
export const mastraInstance = new Mastra({
  agents: { 'paywall-optimizer': paywallOptimizerAgent },
  observability: new Observability({
    configs: {
      default: {
        serviceName: SERVICE_NAME,
        bridge: new OtelBridge(),
      },
    },
  }),
});

