// db/schemas/notification-schema.ts
import { relations } from "drizzle-orm"
import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import type { z } from "zod"

import { user } from "./auth-schema"

// Enums
export const notificationTypeEnum = pgEnum("notification_type", [
  "contribution",
  "penalty",
  "loan",
  "announcement",
  "action_item",
  "meeting",
  "message",
  "payment_received",
  "payment_failed",
  "system",
  "info",
])

export const notificationChannelEnum = pgEnum("notification_channel", [
  "in_app",
  "email",
  "sms",
  "push",
])

// Notification Table
export const notification = pgTable(
  "notification",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    // Notification Details
    type: notificationTypeEnum("type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    channel: notificationChannelEnum("channel").notNull().default("in_app"),

    // Status
    isRead: boolean("is_read").default(false).notNull(),
    readAt: timestamp("read_at"),
    isArchived: boolean("is_archived").default(false).notNull(),
    archivedAt: timestamp("archived_at"),

    // Related Entities
    relatedId: text("related_id"), //  paymentId, etc.
    relatedType: text("related_type"), //  "payment", etc.

    // Action
    actionUrl: text("action_url"),
    actionLabel: text("action_label"),

    // Priority
    priority: text("priority").default("normal"), // "low", "normal", "high", "urgent"

    // Additional Data
    data: jsonb("data").$type<{
      contributionId?: string
      penaltyId?: string
      loanId?: string
      actionItemId?: string
      announcementId?: string
      messageCode?: string
      period?: string
      action?: string
      href?: string
      organizationId?: string
      amount?: number | string
      images?: string[]
      [key: string]: any
    }>(),

    // Delivery Status
    sentAt: timestamp("sent_at"),
    deliveredAt: timestamp("delivered_at"),
    failedAt: timestamp("failed_at"),
    failureReason: text("failure_reason"),

    // Metadata
    metadata: jsonb("metadata").$type<{
      templateId?: string
      scheduledFor?: string
      expiresAt?: string
    }>(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    userIdIdx: index("notification_user_id_idx").on(table.userId),
    typeIdx: index("notification_type_idx").on(table.type),
    isReadIdx: index("notification_is_read_idx").on(table.isRead),
    isArchivedIdx: index("notification_is_archived_idx").on(table.isArchived),
    createdAtIdx: index("notification_created_at_idx").on(table.createdAt),
  })
)

// Relations
export const notificationRelations = relations(notification, ({ one }) => ({
  user: one(user, {
    fields: [notification.userId],
    references: [user.id],
  }),
}))

// Zod schemas
export const insertNotificationSchema = createInsertSchema(notification)
export const selectNotificationSchema = createSelectSchema(notification)

// Type exports
export type Notification = z.infer<typeof selectNotificationSchema>
export type NewNotification = z.infer<typeof insertNotificationSchema>
export type NotificationType =
  | "contribution"
  | "penalty"
  | "loan"
  | "announcement"
  | "action_item"
  | "meeting"
  | "message"
  | "payment_received"
  | "payment_failed"
  | "system"
  | "info"
export type NotificationChannel = "in_app" | "email" | "sms" | "push"
export type NotificationPriority = "low" | "normal" | "high" | "urgent"
