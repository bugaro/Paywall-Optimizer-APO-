import { db, pool } from './index.ts';
import { paywallHistory } from './schema.ts';
import { logger } from '../logger.ts';
import { OllamaLlmAdapter } from '../adapters/ollama-llm.adapter.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function generateMockEmbedding(seedValue: number): number[] {
  const arr: number[] = [];
  for (let i = 0; i < 384; i++) {
    arr.push(Math.sin(seedValue + i));
  }
  // Normalize vector to unit length (ideal for cosine similarity)
  const len = Math.sqrt(arr.reduce((sum, val) => sum + val * val, 0));
  return arr.map((val) => val / len);
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------
const mockEntries = [
  {
    appId: '00000000-0000-0000-0000-000000000001', // App A (Calendar)
    pricePoint: '7.99',
    backgroundColor: 'dark-slate',
    titleText: 'Get Organized Today!',
    ctaText: 'Unlock Premium Calendar',
    conversionRate: 0.045,
    failureCondition: 'App A conversion rate is 1.5%, breaching 3% threshold. Impressions: 1000, conversions: 15.',
  },
  {
    appId: '00000000-0000-0000-0000-000000000002', // App B (Fitness)
    pricePoint: '5.99',
    backgroundColor: 'dark-slate',
    titleText: 'Crush Your Fitness Goals',
    ctaText: 'Start Your Transformation',
    conversionRate: 0.042,
    failureCondition: 'App B conversion rate is 1.8%, breaching 3% threshold. Impressions: 850, conversions: 15.',
  },
  {
    appId: '00000000-0000-0000-0000-000000000002',
    pricePoint: '8.99',
    backgroundColor: 'light',
    titleText: 'Premium Workout Planner',
    ctaText: 'Get Active Now',
    conversionRate: 0.038,
    failureCondition: 'App B conversion rate is 2.2%, breaching 3% threshold. Impressions: 900, conversions: 20.',
  },
  {
    appId: '00000000-0000-0000-0000-000000000001',
    pricePoint: '9.99',
    backgroundColor: 'light',
    titleText: 'Your Ultimate Schedule Planner',
    ctaText: 'Subscribe Now',
    conversionRate: 0.035,
    failureCondition: 'App A conversion rate is 2.5%, breaching 3% threshold. Impressions: 1100, conversions: 27.',
  },
  {
    appId: '00000000-0000-0000-0000-000000000002',
    pricePoint: '7.49',
    backgroundColor: 'dark-slate',
    titleText: 'Unleash Your Strength',
    ctaText: 'Unlock All Workouts',
    conversionRate: 0.048,
    failureCondition: 'High-Performance Fitness Tracker conversion rate is 1.9%, breaching 3% threshold.',
  },
];

// ---------------------------------------------------------------------------
// Seeder
// ---------------------------------------------------------------------------
export async function runSeeder(): Promise<void> {
  logger.info('Seeding paywall history database...');
  try {
    // Clear old entries to prevent duplicates
    await db.delete(paywallHistory);

    const ollama = new OllamaLlmAdapter();
    const seededEntries = await Promise.all(
      mockEntries.map(async (entry, idx) => {
        let embedding: number[];
        try {
          // Attempt to generate real embedding using Ollama
          embedding = await ollama.getEmbedding(entry.failureCondition);
          logger.info(`Generated real embedding using Ollama for: "${entry.failureCondition.substring(0, 30)}..."`);
        } catch (err) {
          logger.warn(`Ollama unreachable/failed, using mock embedding for: "${entry.failureCondition.substring(0, 30)}..."`);
          embedding = generateMockEmbedding(idx + 1);
        }
        return {
          ...entry,
          embedding,
        };
      })
    );

    await db.insert(paywallHistory).values(seededEntries);
    logger.info(`Seeded ${seededEntries.length} paywall history entries.`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Seeding failed: ${message}`);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Run directly
// ---------------------------------------------------------------------------
const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith('seed.ts') ||
    process.argv[1].endsWith('seed.js') ||
    process.argv[1].endsWith('seed'));

if (isDirectRun) {
  runSeeder()
    .then(() => {
      void pool.end();
      process.exit(0);
    })
    .catch(() => {
      void pool.end();
      process.exit(1);
    });
}
