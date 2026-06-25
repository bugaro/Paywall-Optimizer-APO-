import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.ts';
import { DEFAULT_DATABASE_URL } from '../../domain/constants.ts';

const connectionString = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;

export const pool = new pg.Pool({
  connectionString,
});

export const db = drizzle(pool, { schema });
export type MastraDb = typeof db;
