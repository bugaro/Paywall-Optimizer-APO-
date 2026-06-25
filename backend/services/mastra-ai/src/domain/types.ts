import { z } from 'zod';
import { PaywallTheme } from './constants.ts';

export interface TelemetryMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  conversionRate: number;
}

export const AbHypothesisSchema = z.object({
  reasoning: z.string(),
  proposedUi: z.object({
    pricePoint: z.number(),
    backgroundColor: z.string(),
    titleText: z.string(),
    ctaText: z.string()
  })
});

export type AbHypothesis = z.infer<typeof AbHypothesisSchema>;

export interface PaywallHistoryEntry {
  id: string;
  appId: string;
  pricePoint: number;
  backgroundColor: string;
  titleText: string;
  ctaText: string;
  conversionRate: number;
  failureCondition: string;
  embedding: number[];
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// HTTP request contract for POST /api/reasoning/mutate/stream
// Single source of truth — imported by both server.ts and future consumers.
// ---------------------------------------------------------------------------
export const MutateRequestSchema = z.object({
  appId: z.string().min(1),
  metrics: z.object({
    impressions: z.number(),
    clicks: z.number(),
    conversions: z.number(),
    conversionRate: z.number(),
  }),
});

export type MutateRequest = z.infer<typeof MutateRequestSchema>;

export type ChunkType = 'token' | 'status' | 'mutation_update' | 'error';

export interface ReasoningChunk {
  type: ChunkType;
  content: string;
  timestamp: number;
}
