// ---------------------------------------------------------------------------
// Service-wide Constants & Enums
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Mastra Agent persona instructions (injected as system prompt)
// ---------------------------------------------------------------------------
export const AGENT_INSTRUCTIONS = `You are an expert growth data scientist and paywall optimizer.
Your goal is to suggest a high-impact paywall layout mutation (comprising price point, background theme, and copywriting) to recover the app's conversion rate.
You are grounded in historical paywall mutations provided in the user message.
You MUST respond with ONLY valid JSON matching this exact schema:
{
  "reasoning": "string — brief explanation of why this mutation was chosen",
  "proposedUi": {
    "pricePoint": "number — the price point, e.g. 7.99",
    "backgroundColor": "string — either 'light' or 'dark-slate'",
    "titleText": "string — short compelling title for the paywall",
    "ctaText": "string — clear call-to-action text"
  }
}
Do NOT include any text, markdown, or explanation outside the JSON structure.` as const;

export const SERVICE_NAME = 'mastra-ai' as const;

export const CORRELATION_ID_HEADER = 'X-Correlation-ID' as const;

// ---------------------------------------------------------------------------
// Paywall Themes
// ---------------------------------------------------------------------------
export const PaywallTheme = {
  Light: 'light',
  DarkSlate: 'dark-slate',
} as const;
export type PaywallTheme = (typeof PaywallTheme)[keyof typeof PaywallTheme];

// ---------------------------------------------------------------------------
// Ollama configuration
// ---------------------------------------------------------------------------
export const OLLAMA_DEFAULTS = {
  BASE_URL: 'http://localhost:11434',
  EMBEDDING_MODEL: 'all-minilm',
  GENERATION_MODEL: 'qwen2.5:3b',
  EMBEDDING_DIMENSION: 384,
} as const;

// ---------------------------------------------------------------------------
// Proposal generation tuning
// ---------------------------------------------------------------------------
export const PROPOSAL_CONFIG = {
  LLM_TIMEOUT_MS: process.env.LLM_TIMEOUT_MS ? parseInt(process.env.LLM_TIMEOUT_MS, 10) : 4500,
  MAX_LLM_ATTEMPTS: 2,
  RAG_TOP_K: 3,
  CONVERSION_RATE_THRESHOLD: 0.03,
} as const;

// ---------------------------------------------------------------------------
// Server defaults
// ---------------------------------------------------------------------------
export const SERVER_DEFAULTS = {
  PORT: 4006,
} as const;

// ---------------------------------------------------------------------------
// Database defaults
// ---------------------------------------------------------------------------
export const DEFAULT_DATABASE_URL =
  'postgres://postgres:password@localhost:5437/mastra_memory' as const;

// ---------------------------------------------------------------------------
// SSE Stream Status Messages
// ---------------------------------------------------------------------------
export const SSE_STATUS = {
  FETCHING_VECTOR_STORE: '[1/2] Fetching vector store similarities...',
  QUERYING_OLLAMA: '[2/2] Querying Ollama reasoning model...',
} as const;
