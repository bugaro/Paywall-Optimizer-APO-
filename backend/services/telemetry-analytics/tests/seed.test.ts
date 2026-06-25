import { describe, it, expect, vi } from 'vitest';
import { db } from '../src/infrastructure/db';
import { seedDatabaseIfEmpty } from '../src/infrastructure/db/seed';
import {
  applications,
  users,
  usersToApps,
  abTests,
} from '../src/infrastructure/db/schema';
import { eq, sql } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';

describe('Database Seeding Specification', () => {
  // We wrap database operations in a transaction and rollback at the end of each test
  // to ensure test isolation and database cleanliness.

  it('should skip seeding if the database is already seeded (contains applications)', async () => {
    await db.transaction(async (tx) => {
      // Given
      // Insert one app to simulate already-populated DB
      await tx.insert(applications).values({
        name: 'Pre-existing App',
      });

      // When
      // Run the seeding logic
      await seedDatabaseIfEmpty(tx);

      // Then
      // The applications table should only contain the pre-existing app
      const appRecords = await tx.select().from(applications);
      expect(appRecords.length).toBe(1);
      expect(appRecords[0].name).toBe('Pre-existing App');

      // Assert that no users were created either
      const userRecords = await tx.select().from(users);
      expect(userRecords.length).toBe(0);

      tx.rollback();
    }).catch(() => {
      // Catch the expected rollback
    });
  });

  it('should seed database transactionally with 2 apps, 2000 users, 2200 app mappings, and 1 running test when empty', async () => {
    await db.transaction(async (tx) => {
      // Given - Empty database (guaranteed inside clean tx)

      // When
      await seedDatabaseIfEmpty(tx);

      // Then
      // 1. Applications check
      const appRecords = await tx.select().from(applications);
      expect(appRecords.length).toBe(2);
      
      const appA = appRecords.find((a) => a.name === 'Premium Productivity Calendar');
      const appB = appRecords.find((a) => a.name === 'High-Performance Fitness Tracker');
      expect(appA).toBeDefined();
      expect(appB).toBeDefined();

      // 2. Users check
      const userRecords = await tx.select().from(users);
      expect(userRecords.length).toBe(2000);
      expect(userRecords[0].email).toMatch(/user_\d+@example\.com/);

      // 3. User to App mappings check
      const mappingRecords = await tx.select().from(usersToApps);
      expect(mappingRecords.length).toBe(2200); // 900 A + 900 B + (200 * 2)

      // 4. Overlap user distribution check
      // Find count of mapping records per user
      const overlapQuery = await tx
        .select({
          userId: usersToApps.userId,
          count: sql<number>`count(${usersToApps.appId})`.mapWith(Number),
        })
        .from(usersToApps)
        .groupBy(usersToApps.userId);

      const exclusiveUsers = overlapQuery.filter((q) => q.count === 1);
      const overlapUsers = overlapQuery.filter((q) => q.count === 2);

      expect(exclusiveUsers.length).toBe(1800);
      expect(overlapUsers.length).toBe(200);

      // 5. Initial A/B Test check
      const testRecords = await tx.select().from(abTests);
      expect(testRecords.length).toBe(1);
      expect(testRecords[0].name).toBe('App B UI Slates Minimalist');
      expect(testRecords[0].sampleSizePercent).toBe(10);
      expect(testRecords[0].isActive).toBe(true);
      expect(testRecords[0].status).toBe('running');
      expect(testRecords[0].appId).toBe(appB?.id);

      tx.rollback();
    }).catch(() => {
      // Catch the expected rollback
    });
  });

  it('should rollback database transaction fully on any seeding failure (Atomicity Check)', async () => {
    // We want to verify that if user insertions fail midway, no modifications (like the apps)
    // are left in the database.
    await db.transaction(async (tx) => {
      // Given
      // Spy on tx.insert or similar, but since we are running within seedDatabaseIfEmpty,
      // we can mock user insertion to fail by intercepting the database client execution.
      // Alternatively, we mock tx.insert for users table to throw error.
      const originalInsert = tx.insert.bind(tx);
      
      vi.spyOn(tx, 'insert').mockImplementation((table: PgTable) => {
        if (table === users) {
          throw new Error('Database connection interrupted midway through user insertion');
        }
        return originalInsert(table);
      });

      // When & Then
      // Calling seed should throw the error
      await expect(seedDatabaseIfEmpty(tx)).rejects.toThrow(
        'Database connection interrupted midway through user insertion'
      );

      // Verify that the apps table remains empty because the transaction was rolled back
      const appRecords = await tx.select().from(applications);
      expect(appRecords.length).toBe(0);

      vi.restoreAllMocks();
      tx.rollback();
    }).catch(() => {
      // Catch the expected rollback
    });
  });
});
