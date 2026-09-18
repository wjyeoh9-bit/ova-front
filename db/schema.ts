import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const firstBatchSignups = sqliteTable('first_batch_signups', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  whatsapp: text('whatsapp'),
  items: text('items').notNull(),
  totalMyr: integer('total_myr').notNull(),
  attribution: text('attribution').notNull(),
  distinctId: text('distinct_id').notNull(),
  consentVersion: text('consent_version').notNull(),
  createdAt: text('created_at').notNull(),
});
export const signupRateLimits = sqliteTable('signup_rate_limits', {
  key: text('key').primaryKey(),
  window: integer('window').notNull(),
  count: integer('count').notNull(),
});
