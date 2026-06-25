import { pgTable, uuid, varchar, doublePrecision, timestamp, numeric, customType, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { OLLAMA_DEFAULTS } from '../../domain/constants.ts';

// pgvector support in Drizzle custom type
export const pgVector = customType<{ data: number[] }>({
  dataType() {
    return `vector(${OLLAMA_DEFAULTS.EMBEDDING_DIMENSION})`;
  },
  toDriver(value: number[]): string {
    return JSON.stringify(value);
  },
  fromDriver(value: unknown): number[] {
    if (typeof value === 'string') {
      return value.slice(1, -1).split(',').map(Number);
    }
    return value as number[];
  }
});

export const paywallHistory = pgTable('paywall_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  appId: uuid('app_id').notNull(),
  pricePoint: numeric('price_point', { precision: 10, scale: 2 }).notNull(),
  backgroundColor: varchar('background_color', { length: 50 }).notNull(),
  titleText: varchar('title_text', { length: 255 }).notNull(),
  ctaText: varchar('cta_text', { length: 255 }).notNull(),
  conversionRate: doublePrecision('conversion_rate').notNull(),
  failureCondition: varchar('failure_condition', { length: 255 }).notNull(),
  embedding: pgVector('embedding').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => {
  return {
    embeddingIndex: index('embedding_idx').using('hnsw', sql`${table.embedding} vector_cosine_ops`)
  };
});
