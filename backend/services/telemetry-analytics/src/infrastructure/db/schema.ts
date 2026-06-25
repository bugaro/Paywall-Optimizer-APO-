import { pgTable, uuid, varchar, timestamp, boolean, integer, serial, index, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { ABTestStatus, TelemetryEventType, Variant } from '../../domain/entities.ts';

// 1. Applications Table
export const applications = pgTable('applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).unique().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2. Users Table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 3. Users to Applications Junction Table (Cohort Overlap mappings)
export const usersToApps = pgTable('users_to_apps', {
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  appId: uuid('app_id').references(() => applications.id, { onDelete: 'cascade' }).notNull(),
  appASubscribed: boolean('app_a_subscribed').default(false).notNull(),
  appBSubscribed: boolean('app_b_subscribed').default(false).notNull(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.appId] }),
  index('user_id_idx').on(table.userId),
]);

// 4. A/B Tests Table
export const abTests = pgTable('ab_tests', {
  id: uuid('id').primaryKey().defaultRandom(),
  appId: uuid('app_id').references(() => applications.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  sampleSizePercent: integer('sample_size_percent').notNull(),
  isActive: boolean('is_active').default(false).notNull(),
  status: varchar('status', { length: 50 }).$type<ABTestStatus>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 5. Telemetry Events Table
export const telemetryEvents = pgTable('telemetry_events', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  appId: uuid('app_id').references(() => applications.id).notNull(),
  eventType: varchar('event_type', { length: 50 }).$type<TelemetryEventType>().notNull(),
  variant: varchar('variant', { length: 10 }).$type<Variant>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('app_id_created_at_idx').on(table.appId, table.createdAt),
]);

// Relationships definitions
export const applicationsRelations = relations(applications, ({ many }) => ({
  abTests: many(abTests),
  telemetryEvents: many(telemetryEvents),
  usersToApps: many(usersToApps),
}));

export const usersRelations = relations(users, ({ many }) => ({
  usersToApps: many(usersToApps),
  telemetryEvents: many(telemetryEvents),
}));

export const usersToAppsRelations = relations(usersToApps, ({ one }) => ({
  user: one(users, {
    fields: [usersToApps.userId],
    references: [users.id],
  }),
  application: one(applications, {
    fields: [usersToApps.appId],
    references: [applications.id],
  }),
}));

export const abTestsRelations = relations(abTests, ({ one }) => ({
  application: one(applications, {
    fields: [abTests.appId],
    references: [applications.id],
  }),
}));

export const telemetryEventsRelations = relations(telemetryEvents, ({ one }) => ({
  user: one(users, {
    fields: [telemetryEvents.userId],
    references: [users.id],
  }),
  application: one(applications, {
    fields: [telemetryEvents.appId],
    references: [applications.id],
  }),
}));
