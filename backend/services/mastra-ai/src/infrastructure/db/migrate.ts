import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../logger.ts';
import { DEFAULT_DATABASE_URL } from '../../domain/constants.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databaseUrl = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;


export async function runMigrations(): Promise<void> {
  logger.info('Starting database migrations...');

  const client = new pg.Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    const db = drizzle(client);

    const migrationsFolder = path.resolve(__dirname, 'migrations');
    await migrate(db, { migrationsFolder });

    logger.info('Database migrations applied successfully.');
    await client.end();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Migration failed: ${message}`);
    await client.end().catch(() => {});
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Run directly
// ---------------------------------------------------------------------------
const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith('migrate.ts') ||
    process.argv[1].endsWith('migrate.js') ||
    process.argv[1].endsWith('migrate'));

if (isDirectRun) {
  runMigrations().catch(() => {
    process.exit(1);
  });
}
