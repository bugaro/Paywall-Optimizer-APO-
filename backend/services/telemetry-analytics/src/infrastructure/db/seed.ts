import { sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema.ts';
import { applications, users, usersToApps } from './schema.ts';
import { ValidationError } from '../../domain/errors.ts';
import { APP_IDS, APP_NAMES } from '../../domain/constants.ts';
import type { Logger } from '../../domain/types.ts';
export async function seedDatabaseIfEmpty(db: NodePgDatabase<typeof schema>, log?: Logger): Promise<void> {
  const logFn = log ?? console;
  const appCountResult = await db.select({ count: sql`count(*)` }).from(applications);
  const count = Number(appCountResult[0].count);
  if (count > 0) {
    logFn.info("Database already contains application data. Seeding skipped.");
    return;
  }

  logFn.info("Database seeding initiated...");

  try {
    await db.transaction(async (tx) => {
      const insertedApps = await tx
        .insert(applications)
        .values([
          { id: APP_IDS.PREMIUM_CALENDAR, name: APP_NAMES.PREMIUM_CALENDAR },
          { id: APP_IDS.FITNESS_TRACKER, name: APP_NAMES.FITNESS_TRACKER },
        ])
        .returning({ id: applications.id, name: applications.name });

      const appA = insertedApps.find((a) => a.id === APP_IDS.PREMIUM_CALENDAR);
      const appB = insertedApps.find((a) => a.id === APP_IDS.FITNESS_TRACKER);

      if (!appA || !appB) {
        throw new ValidationError('Failed to insert applications');
      }

      const totalUsers = 2000;
      const chunkSize = 500;
      const userList: { id?: string; email: string }[] = [];
      for (let i = 1; i <= totalUsers; i++) {
        if (i === 5) {
          userList.push({ id: '00000000-0000-0000-0000-000000000005', email: `user_${i}@example.com` });
        } else {
          userList.push({ email: `user_${i}@example.com` });
        }
      }

      const insertedUsers: { id: string; email: string }[] = [];
      for (let i = 0; i < userList.length; i += chunkSize) {
        const chunk = userList.slice(i, i + chunkSize);
        const usersChunk = await tx
          .insert(users)
          .values(chunk)
          .returning({ id: users.id, email: users.email });
        insertedUsers.push(...usersChunk);
      }

      insertedUsers.sort((a, b) => {
        const numA = parseInt(a.email.split('_')[1], 10);
        const numB = parseInt(b.email.split('_')[1], 10);
        return numA - numB;
      });

      const mappingValues: { userId: string; appId: string; appASubscribed: boolean; appBSubscribed: boolean }[] = [];

      for (let i = 0; i < 900; i++) {
        mappingValues.push({
          userId: insertedUsers[i].id,
          appId: appA.id,
          appASubscribed: false,
          appBSubscribed: false,
        });
      }

      for (let i = 900; i < 1800; i++) {
        mappingValues.push({
          userId: insertedUsers[i].id,
          appId: appB.id,
          appASubscribed: false,
          appBSubscribed: false,
        });
      }

      for (let i = 1800; i < 2000; i++) {
        const userId = insertedUsers[i].id;
        mappingValues.push({
          userId,
          appId: appA.id,
          appASubscribed: false,
          appBSubscribed: false,
        });
        mappingValues.push({
          userId,
          appId: appB.id,
          appASubscribed: false,
          appBSubscribed: false,
        });
      }

      for (let i = 0; i < mappingValues.length; i += chunkSize) {
        const chunk = mappingValues.slice(i, i + chunkSize);
        await tx.insert(usersToApps).values(chunk);
      }

    });

    logFn.info(
      'Database seeded successfully: 2 applications, 2,000 users, and 2,200 app mappings created.'
    );
  } catch (error) {
    logFn.error(`Database seeding failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}
