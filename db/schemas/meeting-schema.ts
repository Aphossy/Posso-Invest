// db/schemas/meeting-schema.ts
import { relations } from "drizzle-orm"
import {
  decimal,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import type { z } from "zod"

import { user } from "./auth-schema"

export const meetingStatusEnum = pgEnum("meeting_status", [
  "scheduled",
  "completed",
  "cancelled",
])

export const meeting = pgTable(
  "meeting",
  {
    id: text("id").primaryKey(),
    title: varchar("title", { length: 120 }).notNull(),
    scheduledAt: timestamp("scheduled_at").notNull(),
    location: text("location"),
    agenda: text("agenda"),
    status: meetingStatusEnum("status").notNull().default("scheduled"),
    hostContribution: decimal("host_contribution", {
      precision: 10,
      scale: 2,
    }).default("10000"),

    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    statusIdx: index("meeting_status_idx").on(table.status),
    scheduledAtIdx: index("meeting_scheduled_at_idx").on(table.scheduledAt),
  })
)

export const meetingRelations = relations(meeting, ({ one }) => ({
  creator: one(user, {
    fields: [meeting.createdBy],
    references: [user.id],
    relationName: "meetingCreatedBy",
  }),
}))

export const insertMeetingSchema = createInsertSchema(meeting)
export const selectMeetingSchema = createSelectSchema(meeting)

export type Meeting = z.infer<typeof selectMeetingSchema>
export type NewMeeting = z.infer<typeof insertMeetingSchema>
export type MeetingStatus = "scheduled" | "completed" | "cancelled"
