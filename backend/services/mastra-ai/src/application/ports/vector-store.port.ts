import type { PaywallHistoryEntry } from '../../domain/types.ts';

export interface VectorStorePort {
  findSimilarMutations(queryEmbedding: number[], limit: number): Promise<PaywallHistoryEntry[]>;
  saveMutation(entry: Omit<PaywallHistoryEntry, 'id' | 'createdAt'>): Promise<PaywallHistoryEntry>;
}
