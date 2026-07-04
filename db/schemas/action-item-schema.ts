import { relations } from "drizzle-orm"
import { index, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import type { z } from "zod"

import { user } from "./auth-schema"
import { meeting } from "./meeting-schema"
import { meetingMinutes } from "./minutes-schema"

export const actionItemStatusEnum = pgEnum("action_item_status", [
  "open",
  "in_progress",
  "blocked",
  "done",
  "cancelled",
])

export const actionItemPriorityEnum = pgEnum("action_item_priority", [
  "low",
  "medium",
  "high",
  "urgent",
])

export const actionItem = pgTable(
  "action_item",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    status: actionItemStatusEnum("status").notNull().default("open"),
    priority: actionItemPriorityEnum("priority").notNull().default("medium"),
    dueDate: timestamp("due_date"),
    completedAt: timestamp("completed_at"),
    meetingId: text("meeting_id").references(() => meeting.id, {
      onDelete: "set null",
    }),
    minutesId: text("minutes_id").references(() => meetingMinutes.id, {
      onDelete: "set null",
    }),
    ownerId: text("owner_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    statusIdx: index("action_item_status_idx").on(table.status),
    priorityIdx: index("action_item_priority_idx").on(table.priority),
    meetingIdx: index("action_item_meeting_idx").on(table.meetingId),
    ownerIdx: index("action_item_owner_idx").on(table.ownerId),
    dueDateIdx: index("action_item_due_date_idx").on(table.dueDate),
  })
)

export const actionItemRelations = relations(actionItem, ({ one }) => ({
  meeting: one(meeting, {
    fields: [actionItem.meetingId],
    references: [meeting.id],
  }),
  minutes: one(meetingMinutes, {
    fields: [actionItem.minutesId],
    references: [meetingMinutes.id],
  }),
  owner: one(user, {
    fields: [actionItem.ownerId],
    references: [user.id],
    relationName: "actionItemOwner",
  }),
  creator: one(user, {
    fields: [actionItem.createdBy],
    references: [user.id],
    relationName: "actionItemCreatedBy",
  }),
}))

export const insertActionItemSchema = createInsertSchema(actionItem)
export const selectActionItemSchema = createSelectSchema(actionItem)

export type ActionItem = z.infer<typeof selectActionItemSchema>
export type NewActionItem = z.infer<typeof insertActionItemSchema>
export type ActionItemStatus =
  | "open"
  | "in_progress"
  | "blocked"
  | "done"
  | "cancelled"
export type ActionItemPriority = "low" | "medium" | "high" | "urgent"
