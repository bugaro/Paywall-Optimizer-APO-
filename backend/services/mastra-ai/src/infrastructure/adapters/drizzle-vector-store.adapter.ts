import { sql } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { paywallHistory } from '../db/schema.ts';
import type { VectorStorePort } from '../../application/ports/vector-store.port.ts';
import type { PaywallHistoryEntry } from '../../domain/types.ts';
import { logger } from '../logger.ts';
import { vectorSearchDurationHistogram } from '../metrics.ts';

// ---------------------------------------------------------------------------
// Row mapper (single source of truth for DB row → domain entity conversion)
// ---------------------------------------------------------------------------
type PaywallHistoryRow = typeof paywallHistory.$inferSelect;

function mapRowToEntry(r: PaywallHistoryRow): PaywallHistoryEntry {
  return {
    id: r.id,
    appId: r.appId,
    pricePoint: parseFloat(r.pricePoint), // numeric string → TS number
    backgroundColor: r.backgroundColor,
    titleText: r.titleText,
    ctaText: r.ctaText,
    conversionRate: r.conversionRate,
    failureCondition: r.failureCondition,
    embedding: r.embedding,
    createdAt: r.createdAt,
  };
}

export class DrizzleVectorStoreAdapter implements VectorStorePort {
  async findSimilarMutations(queryEmbedding: number[], limit: number): Promise<PaywallHistoryEntry[]> {
    if (limit <= 0) {
      return [];
    }

    const start = process.hrtime();
    try {
      // Format vector query for pgvector: '[0.1,0.2,...]'
      const vectorStr = `[${queryEmbedding.join(',')}]`;
      const distance = sql<number>`${paywallHistory.embedding} <=> ${vectorStr}::vector`;

      const rows = await db.select().from(paywallHistory).orderBy(distance).limit(limit);

      const entries = rows.map(mapRowToEntry);
      logger.info({ count: entries.length }, 'Vector search executed');
      return entries;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ reason: message }, 'Vector search error');
      throw error;
    } finally {
      const diff = process.hrtime(start);
      const duration = diff[0] + diff[1] / 1e9;
      vectorSearchDurationHistogram.observe(duration);
    }
  }

  async saveMutation(entry: Omit<PaywallHistoryEntry, 'id' | 'createdAt'>): Promise<PaywallHistoryEntry> {
    try {
      const results = await db
        .insert(paywallHistory)
        .values({
          appId: entry.appId,
          pricePoint: entry.pricePoint.toString(), // TS number → numeric string
          backgroundColor: entry.backgroundColor,
          titleText: entry.titleText,
          ctaText: entry.ctaText,
          conversionRate: entry.conversionRate,
          failureCondition: entry.failureCondition,
          embedding: entry.embedding,
        })
        .returning();

      return mapRowToEntry(results[0]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ reason: message }, 'Failed to save mutation');
      throw error;
    }
  }
}
