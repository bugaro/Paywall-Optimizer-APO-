export const PAYWALL_THEMES = {
  LIGHT: 'light',
  DARK_SLATE: 'dark-slate',
} as const;

export type PaywallTheme = typeof PAYWALL_THEMES[keyof typeof PAYWALL_THEMES];

export const APP_B_UUIDS = [
  'app-b-uuid',
  '00000000-0000-0000-0000-000000000002',
] as const;

export const CONVERSION_RATE_BREACH_THRESHOLD = 0.03;

export const REMEDIATION_CARD_TYPE = 'PaywallExperimentCard';

export const AGENT_PROVIDERS = {
  OLLAMA: 'ollama',
} as const;

export type AgentProvider = typeof AGENT_PROVIDERS[keyof typeof AGENT_PROVIDERS];

export const DEFAULT_OLLAMA_MODEL = 'qwen2.5:3b';
export const DEFAULT_MASTRA_AI_URL = 'http://localhost:4006';
export const DEFAULT_PORT = 4005;
export const CONTENT_TYPE_JSON = 'application/json';

export const CORRELATION_ID_HEADER = 'X-Correlation-ID';

export const SERVICE_CONTEXT = 'copilot-bridge';

export const DEFAULT_TELEMETRY_ANALYTICS_URL = 'http://apo-telemetry-analytics:4003';

export const DOWNSTREAM_TIMEOUT_MS = 5000;

export const TELEMETRY_ENDPOINTS = {
  METRICS: '/api/metrics',
  EXPERIMENTS: '/api/experiments',
  RESET: '/api/reset',
} as const;
