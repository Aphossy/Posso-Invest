import { relations } from "drizzle-orm"
import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { createSelectSchema } from "drizzle-zod"
import type { z } from "zod"

import { user } from "./auth-schema"

// ---------------------------------------------------------------------------
// Enum
// ---------------------------------------------------------------------------

export const emailSendStatusEnum = pgEnum("email_send_status", [
  "pending",
  "sent",
  "failed",
])

// ---------------------------------------------------------------------------
// Table
//
// One row per (userId, eventType, period) triple.
// The unique index on those three columns is the deduplication key - it
// prevents a second email from ever being sent to the same member for the
// same event in the same period, even across retries or replays.
// ---------------------------------------------------------------------------

export const emailSendLog = pgTable(
  "email_send_log",
  {
    id: text("id").primaryKey(),

    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    email: text("email").notNull(),

    // Which scheduled notification triggered this (e.g. "contribution_window_opened")
    eventType: text("event_type").notNull(),

    // Billing period this notification belongs to (e.g. "2026-04")
    period: text("period").notNull(),

    // Delivery state
    status: emailSendStatusEnum("status").notNull().default("pending"),

    // How many send attempts have been made (incremented on each failure)
    attempts: integer("attempts").notNull().default(0),

    // Timestamps
    lastAttemptAt: timestamp("last_attempt_at"),
    sentAt: timestamp("sent_at"),
    failedAt: timestamp("failed_at"),
    failureReason: text("failure_reason"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    // Enforce one row per member per event per period (deduplication key)
    userEventPeriodUidx: uniqueIndex("esl_user_event_period_uidx").on(
      table.userId,
      table.eventType,
      table.period
    ),
    statusIdx: index("esl_status_idx").on(table.status),
    periodIdx: index("esl_period_idx").on(table.period),
    eventTypeIdx: index("esl_event_type_idx").on(table.eventType),
    userIdIdx: index("esl_user_id_idx").on(table.userId),
  })
)

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const emailSendLogRelations = relations(emailSendLog, ({ one }) => ({
  user: one(user, {
    fields: [emailSendLog.userId],
    references: [user.id],
  }),
}))

// ---------------------------------------------------------------------------
// Zod / type exports
// ---------------------------------------------------------------------------

export const selectEmailSendLogSchema = createSelectSchema(emailSendLog)

export type EmailSendLog = z.infer<typeof selectEmailSendLogSchema>

export type EmailSendStatus = "pending" | "sent" | "failed"

export type EmailEventType =
  // Scheduled contribution-window events (refId = period "YYYY-MM")
  | "contribution_window_opened"
  | "contribution_window_reminder"
  | "contribution_window_last_day"
  | "contribution_deadline_passed"
  // Monthly compliance (refId = period "YYYY-MM")
  | "monthly_compliance_summary"
  // Member-facing triggered events (refId = entity ID)
  | "member_welcome"
  | "contribution_recorded_member"
  | "loan_requested_member"
  | "penalty_recorded_member"
  | "action_item_created_owner"
  | "action_item_status_changed_owner"
  // Leadership triggered events (refId = entity ID)
  | "announcement_published"
  | "action_item_created_leadership"
  | "action_item_status_changed_leadership"
  | "contribution_recorded_leadership"
  | "loan_requested_leadership"
  | "penalty_recorded_leadership"
