// db/schemas/subscriber-schema.ts
import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { z } from "zod"

// ============================================
// ENUMS
// ============================================

export const subscriberStatusEnum = pgEnum("subscriber_status", [
  "active", // Active subscriber
  "unsubscribed", // User unsubscribed
  "bounced", // Email bounced
])

export const subscriberSourceEnum = pgEnum("subscriber_source", [
  "maintenance-page",
  "landing-page",
  "footer",
  "contact-form",
  "other",
])

// ============================================
// TABLES
// ============================================

export const subscribers = pgTable(
  "subscribers",
  {
    // Core identification
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    // Subscriber Information
    email: varchar("email", { length: 255 }).notNull().unique(),

    // Status & Management
    status: subscriberStatusEnum("status").default("active").notNull(),
    source: subscriberSourceEnum("source").default("maintenance-page"),

    // Engagement tracking
    isEmailVerified: boolean("is_email_verified").default(false),
    verificationToken: varchar("verification_token", { length: 255 }),
    verifiedAt: timestamp("verified_at"),

    // Metadata
    ipAddress: varchar("ip_address", { length: 50 }),
    userAgent: text("user_agent"),
    referrer: text("referrer"),

    // Unsubscribe tracking
    unsubscribedAt: timestamp("unsubscribed_at"),
    unsubscribeReason: text("unsubscribe_reason"),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: index("subscriber_email_idx").on(table.email),
    statusIdx: index("subscriber_status_idx").on(table.status),
    sourceIdx: index("subscriber_source_idx").on(table.source),
    createdAtIdx: index("subscriber_created_at_idx").on(table.createdAt),
  })
)

// ============================================
// SCHEMAS FOR VALIDATION
// ============================================

export const insertSubscriberSchema = createInsertSchema(subscribers).extend({
  email: z.string().email("Please enter a valid email address"),
})

export const selectSubscriberSchema = createSelectSchema(subscribers)

// Type exports
export type Subscriber = typeof subscribers.$inferSelect
export type NewSubscriber = typeof subscribers.$inferInsert
export type SubscriberStatus = (typeof subscriberStatusEnum.enumValues)[number]
export type SubscriberSource = (typeof subscriberSourceEnum.enumValues)[number]
