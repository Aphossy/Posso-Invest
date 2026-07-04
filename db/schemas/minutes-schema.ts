// db/schemas/minutes-schema.ts
import { relations } from "drizzle-orm"
import {
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
import { meeting } from "./meeting-schema"

export const minutesStatusEnum = pgEnum("minutes_status", [
  "draft",
  "finalized",
  "published",
])

export const meetingMinutes = pgTable(
  "meeting_minutes",
  {
    id: text("id").primaryKey(),
    meetingId: text("meeting_id")
      .notNull()
      .references(() => meeting.id, { onDelete: "cascade" }),
    status: minutesStatusEnum("status").notNull().default("draft"),

    summary: text("summary"),
    decisions: jsonb("decisions").$type<{
      items?: string[]
    }>(),
    actionItems: jsonb("action_items").$type<{
      items?: {
        task: string
        owner?: string
        dueDate?: string
        status?: string
      }[]
    }>(),
    attendance: jsonb("attendance").$type<{
      presentIds?: string[]
      absentIds?: string[]
      guests?: string[]
    }>(),

    recordedBy: text("recorded_by").references(() => user.id, {
      onDelete: "set null",
    }),
    approvedBy: text("approved_by").references(() => user.id, {
      onDelete: "set null",
    }),
    publishedAt: timestamp("published_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    meetingIdIdx: index("meeting_minutes_meeting_id_idx").on(table.meetingId),
    statusIdx: index("meeting_minutes_status_idx").on(table.status),
    createdAtIdx: index("meeting_minutes_created_at_idx").on(table.createdAt),
  })
)

export const meetingMinutesRelations = relations(meetingMinutes, ({ one }) => ({
  meeting: one(meeting, {
    fields: [meetingMinutes.meetingId],
    references: [meeting.id],
  }),
  recorder: one(user, {
    fields: [meetingMinutes.recordedBy],
    references: [user.id],
    relationName: "minutesRecordedBy",
  }),
  approver: one(user, {
    fields: [meetingMinutes.approvedBy],
    references: [user.id],
    relationName: "minutesApprovedBy",
  }),
}))

export const insertMeetingMinutesSchema = createInsertSchema(meetingMinutes)
export const selectMeetingMinutesSchema = createSelectSchema(meetingMinutes)

export type MeetingMinutes = z.infer<typeof selectMeetingMinutesSchema>
export type NewMeetingMinutes = z.infer<typeof insertMeetingMinutesSchema>
export type MinutesStatus = "draft" | "finalized" | "published"
