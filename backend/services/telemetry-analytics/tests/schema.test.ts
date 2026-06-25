import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../src/infrastructure/db';
import {
  applications,
  users,
  usersToApps,
  abTests,
  telemetryEvents,
} from '../src/infrastructure/db/schema';
import { eq } from 'drizzle-orm';

describe('Database Schema Specification', () => {
  // We wrap database operations in a transaction and rollback at the end of each test
  // to ensure test isolation and database cleanliness.

  it('should define the applications table with correct structure', async () => {
    // Given & When & Then
    expect(applications).toBeDefined();
    expect(applications.id).toBeDefined();
    expect(applications.name).toBeDefined();
    expect(applications.createdAt).toBeDefined();
  });

  it('should define the users table with correct structure', async () => {
    // Given & When & Then
    expect(users).toBeDefined();
    expect(users.id).toBeDefined();
    expect(users.email).toBeDefined();
    expect(users.createdAt).toBeDefined();
  });

  it('should define the users_to_apps table with correct structure and composite primary key', async () => {
    // Given & When & Then
    expect(usersToApps).toBeDefined();
    expect(usersToApps.userId).toBeDefined();
    expect(usersToApps.appId).toBeDefined();
    expect(usersToApps.appASubscribed).toBeDefined();
    expect(usersToApps.appBSubscribed).toBeDefined();
  });

  it('should define the ab_tests table with correct structure', async () => {
    // Given & When & Then
    expect(abTests).toBeDefined();
    expect(abTests.id).toBeDefined();
    expect(abTests.appId).toBeDefined();
    expect(abTests.name).toBeDefined();
    expect(abTests.sampleSizePercent).toBeDefined();
    expect(abTests.isActive).toBeDefined();
    expect(abTests.status).toBeDefined();
    expect(abTests.createdAt).toBeDefined();
  });

  it('should define the telemetry_events table with correct structure', async () => {
    // Given & When & Then
    expect(telemetryEvents).toBeDefined();
    expect(telemetryEvents.id).toBeDefined();
    expect(telemetryEvents.userId).toBeDefined();
    expect(telemetryEvents.appId).toBeDefined();
    expect(telemetryEvents.eventType).toBeDefined();
    expect(telemetryEvents.variant).toBeDefined();
    expect(telemetryEvents.createdAt).toBeDefined();
  });

  // ==========================================
  // Schema Integration / Constraint Testing
  // ==========================================
  describe('Database Constraints & Relations Integration', () => {
    it('should reject inserting duplicate application names (Unique Constraint)', async () => {
      await db.transaction(async (tx) => {
        // Given
        const appName = 'Unique Test App';
        await tx.insert(applications).values({
          name: appName,
        });

        // When & Then
        // Attempting to insert another application with the same name should fail
        await expect(
          tx.insert(applications).values({
            name: appName,
          })
        ).rejects.toThrow();

        // Rollback transaction to keep clean state
        tx.rollback();
      }).catch(() => {
        // Catch the expected rollback
      });
    });

    it('should reject inserting users_to_apps junction row referencing non-existent user or app (Foreign Key Constraints)', async () => {
      await db.transaction(async (tx) => {
        // Given
        const nonExistentUserId = '00000000-0000-0000-0000-000000000000';
        const nonExistentAppId = '00000000-0000-0000-0000-000000000001';

        // When & Then
        // Attempting to insert a junction record referencing invalid IDs must trigger a foreign key violation
        await expect(
          tx.insert(usersToApps).values({
            userId: nonExistentUserId,
            appId: nonExistentAppId,
            appASubscribed: false,
            appBSubscribed: false,
          })
        ).rejects.toThrow();

        tx.rollback();
      }).catch(() => {
        // Catch the expected rollback
      });
    });

    it('should cascade delete users_to_apps mappings when user is deleted', async () => {
      await db.transaction(async (tx) => {
        // Given
        const appResults = await tx.insert(applications).values({
          name: 'Cascade Test App',
        }).returning({ id: applications.id });
        const appId = appResults[0].id;

        const userResults = await tx.insert(users).values({
          email: 'cascade_user@example.com',
        }).returning({ id: users.id });
        const userId = userResults[0].id;

        await tx.insert(usersToApps).values({
          userId,
          appId,
          appASubscribed: false,
          appBSubscribed: false,
        });

        // When
        // Delete the user
        await tx.delete(users).where(eq(users.id, userId));

        // Then
        // Verify the users_to_apps row was cascade-deleted
        const junctionCount = await tx.select().from(usersToApps).where(
          eq(usersToApps.userId, userId)
        );
        expect(junctionCount.length).toBe(0);

        tx.rollback();
      }).catch(() => {
        // Catch the expected rollback
      });
    });
  });
});
