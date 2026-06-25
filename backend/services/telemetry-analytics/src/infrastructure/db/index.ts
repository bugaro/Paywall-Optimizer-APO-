import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { eq, and, sql, gte } from 'drizzle-orm';
import * as schema from './schema.ts';
import { applications, users, usersToApps, abTests, telemetryEvents } from './schema.ts';
import type { ABTestRepository } from '../../application/ports/ab-test-repository.ts';
import type { TelemetryRepository } from '../../application/ports/telemetry-repository.ts';
import type { UserRepository } from '../../application/ports/user-repository.ts';
import type { ABTest, TelemetryEvent, User, CohortOverlap, MetricsSeries } from '../../domain/entities.ts';
import { NotFoundError } from '../../domain/errors.ts';
import { APP_IDS } from '../../domain/constants.ts';
import type { Logger } from '../../domain/types.ts';


const connectionString = process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/apo_telemetry';

export let logger: Logger = console;

export function setLogger(l: Logger): void {
  logger = l;
}

export const pool = new pg.Pool({
  connectionString,
});

export const db = drizzle(pool, { schema });

// 1. A/B Test Repository Implementation
export class DbABTestRepository implements ABTestRepository {
  async getActiveByAppId(appId: string): Promise<ABTest | null> {
    const results = await db
      .select()
      .from(abTests)
      .where(
        and(
          eq(abTests.appId, appId),
          eq(abTests.isActive, true),
          eq(abTests.status, 'running')
        )
      )
      .limit(1);

    if (results.length === 0) return null;
    return results[0] as ABTest;
  }

  async createActive(appId: string, name: string, sampleSizePercent: number): Promise<ABTest> {
    await db
      .update(abTests)
      .set({ isActive: false, status: 'completed' })
      .where(
        and(
          eq(abTests.appId, appId),
          eq(abTests.isActive, true)
        )
      );

    const results = await db
      .insert(abTests)
      .values({
        appId,
        name,
        sampleSizePercent,
        isActive: true,
        status: 'running',
      })
      .returning();

    return results[0] as ABTest;
  }
}

// 2. User Repository Implementation
export class DbUserRepository implements UserRepository {
  async getById(id: string): Promise<User | null> {
    const results = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (results.length === 0) return null;
    return results[0] as User;
  }

  async getOverlapUsers(): Promise<CohortOverlap[]> {
    const results = await db.select().from(usersToApps);
    return results.map((r) => ({
      userId: r.userId,
      appId: r.appId,
      appASubscribed: r.appASubscribed,
      appBSubscribed: r.appBSubscribed,
    }));
  }

  async updateSubscription(userId: string, appId: string, subscribed: boolean): Promise<void> {
    const app = await db.select().from(applications).where(eq(applications.id, appId)).limit(1);
    if (app.length === 0) {
      throw new NotFoundError(`Application not found: ${appId}`);
    }

    const updateObj: Record<string, boolean> = {};
    if (appId === APP_IDS.PREMIUM_CALENDAR) {
      updateObj.appASubscribed = subscribed;
    } else if (appId === APP_IDS.FITNESS_TRACKER) {
      updateObj.appBSubscribed = subscribed;
    }

    await db
      .update(usersToApps)
      .set(updateObj)
      .where(
        and(
          eq(usersToApps.userId, userId),
          eq(usersToApps.appId, appId)
        )
      );
  }
}

// 3. Telemetry Repository Implementation
export class DbTelemetryRepository implements TelemetryRepository {
  async save(event: TelemetryEvent): Promise<void> {
    await db.insert(telemetryEvents).values({
      userId: event.userId,
      appId: event.appId,
      eventType: event.eventType,
      variant: event.variant,
      createdAt: event.timestamp,
    });
  }

  async saveBatch(events: TelemetryEvent[]): Promise<void> {
    if (events.length === 0) return;
    await db.insert(telemetryEvents).values(
      events.map((event) => ({
        userId: event.userId,
        appId: event.appId,
        eventType: event.eventType,
        variant: event.variant,
        createdAt: event.timestamp,
      }))
    );
  }

  async getAggregatedMetrics(appId: string, since: Date): Promise<MetricsSeries[]> {
    const intervalSql = sql<string>`to_timestamp(floor(extract(epoch from ${telemetryEvents.createdAt}) / 5) * 5)`;

    const results = await db
      .select({
        windowStart: intervalSql,
        variant: telemetryEvents.variant,
        eventType: telemetryEvents.eventType,
        count: sql<number>`count(*)`
      })
      .from(telemetryEvents)
      .where(
        and(
          eq(telemetryEvents.appId, appId),
          gte(telemetryEvents.createdAt, since)
        )
      )
      .groupBy(
        intervalSql,
        telemetryEvents.variant,
        telemetryEvents.eventType
      );

    const windowMap = new Map<string, { [variant in 'A' | 'B']?: { impressions: number; clicks: number; purchases: number } }>();

    for (const row of results) {
      const key = new Date(row.windowStart).toISOString();
      const variant = row.variant as 'A' | 'B';
      const eventType = row.eventType;
      const count = Number(row.count);

      if (!windowMap.has(key)) {
        windowMap.set(key, {});
      }
      const window = windowMap.get(key)!;
      if (!window[variant]) {
        window[variant] = { impressions: 0, clicks: 0, purchases: 0 };
      }

      if (eventType === 'impression') {
        window[variant]!.impressions += count;
      } else if (eventType === 'click') {
        window[variant]!.clicks += count;
      } else if (eventType === 'purchase') {
        window[variant]!.purchases += count;
      }
    }

    const metricsSeriesList: MetricsSeries[] = [];
    for (const [timestamp, variantsData] of windowMap.entries()) {
      for (const variant of ['A', 'B'] as const) {
        const data = variantsData[variant];
        if (data) {
          const conversionRate = data.impressions > 0 ? data.purchases / data.impressions : 0;
          metricsSeriesList.push({
            timestamp,
            variant,
            impressions: data.impressions,
            clicks: data.clicks,
            purchases: data.purchases,
            conversionRate,
          });
        }
      }
    }

    metricsSeriesList.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    return metricsSeriesList;
  }
}

export const abTestRepository = new DbABTestRepository();
export const userRepository = new DbUserRepository();
export const telemetryRepository = new DbTelemetryRepository();
