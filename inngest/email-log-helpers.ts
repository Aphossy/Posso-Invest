/**
 * Shared helpers for tracking email delivery in the email_send_log table.
 *
 * Each helper is keyed by (userId, eventType, refId) which maps to the
 * unique index (user_id, event_type, period) in the DB. `refId` is a
 * billing period ("2026-04") for scheduled/cron events, or an entity ID
 * (announcementId, actionItemId, etc.) for triggered events.
 *
 * The unique index is the hard deduplication guarantee: a second row for
 * the same member + event + refId can never be inserted, so a member can
 * never receive the same email twice regardless of retries or replays.
 */

import { db } from "@/db/connection"
import { emailSendLog } from "@/db/schemas"
import { and, eq, sql } from "drizzle-orm"

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
  | "action_item_status_changed_owner" // refId = "<actionItemId>:<newStatus>"
  // Leadership triggered events (refId = entity ID)
  | "announcement_published"
  | "action_item_created_leadership"
  | "action_item_status_changed_leadership"
  | "contribution_recorded_leadership"
  | "loan_requested_leadership"
  | "loan_approved_treasurer"
  | "loan_approved_leadership"
  | "loan_near_due_member"
  | "loan_near_due_leadership"
  | "loan_overdue_member"
  | "penalty_recorded_leadership"

/**
 * Creates a pending log row if one does not already exist.
 * Safe to call multiple times - existing rows (including "sent") are never
 * overwritten due to onConflictDoNothing.
 */
export async function ensureEmailLogRecord(
  userId: string,
  email: string,
  eventType: EmailEventType,
  refId: string
): Promise<void> {
  await db
    .insert(emailSendLog)
    .values({
      id: `esl-${userId}-${eventType}-${refId}`,
      userId,
      email,
      eventType,
      period: refId, // "period" column stores period or entity ID
      status: "pending",
      attempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing()
}

/**
 * Returns the current delivery status for a log row, or null if not found.
 */
export async function getEmailLogStatus(
  userId: string,
  eventType: EmailEventType,
  refId: string
): Promise<"pending" | "sent" | "failed" | null> {
  const rows = await db
    .select({ status: emailSendLog.status })
    .from(emailSendLog)
    .where(
      and(
        eq(emailSendLog.userId, userId),
        eq(emailSendLog.eventType, eventType),
        eq(emailSendLog.period, refId)
      )
    )
    .limit(1)
  return (rows[0]?.status as "pending" | "sent" | "failed") ?? null
}

/**
 * Marks the log row as successfully sent and clears any previous failure data.
 */
export async function markEmailSent(
  userId: string,
  eventType: EmailEventType,
  refId: string
): Promise<void> {
  await db
    .update(emailSendLog)
    .set({
      status: "sent",
      sentAt: new Date(),
      lastAttemptAt: new Date(),
      failedAt: null,
      failureReason: null,
      attempts: sql`${emailSendLog.attempts} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(emailSendLog.userId, userId),
        eq(emailSendLog.eventType, eventType),
        eq(emailSendLog.period, refId)
      )
    )
}

/**
 * Marks the log row as failed and increments the attempt counter.
 */
export async function markEmailFailed(
  userId: string,
  eventType: EmailEventType,
  refId: string,
  reason: string
): Promise<void> {
  await db
    .update(emailSendLog)
    .set({
      status: "failed",
      failedAt: new Date(),
      lastAttemptAt: new Date(),
      failureReason: reason.slice(0, 500),
      attempts: sql`${emailSendLog.attempts} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(emailSendLog.userId, userId),
        eq(emailSendLog.eventType, eventType),
        eq(emailSendLog.period, refId)
      )
    )
}

/**
 * Returns the userIds of all log rows that are in "failed" status for the
 * given event + refId. Used to build the retry list after the initial send.
 */
export async function findFailedEmailLogs(
  eventType: EmailEventType,
  refId: string
): Promise<string[]> {
  const rows = await db
    .select({ userId: emailSendLog.userId })
    .from(emailSendLog)
    .where(
      and(
        eq(emailSendLog.eventType, eventType),
        eq(emailSendLog.period, refId),
        eq(emailSendLog.status, "failed")
      )
    )
  return rows.map((r: { userId: string }) => r.userId)
}
