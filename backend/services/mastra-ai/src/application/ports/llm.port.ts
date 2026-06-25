import type { PaywallHistoryEntry } from '../../domain/types.ts';

export interface EmbeddingPort {
  getEmbedding(text: string): Promise<number[]>;
}
