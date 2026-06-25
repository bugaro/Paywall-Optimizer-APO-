import type { PaywallTheme } from './constants.ts';

export interface PaywallMutation {
  price: string;
  theme: PaywallTheme;
  ctaCopy: string;
}

export interface TelemetryMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  conversionRate: number;
}

export interface SplitConfig {
  appId: string;
  sampleSizePercent: number;
  mutation: PaywallMutation;
}

export type ChunkType = 'token' | 'status' | 'mutation_update' | 'error';

export interface ReasoningChunk {
  type: ChunkType;
  content: string;
  timestamp: number;
}

