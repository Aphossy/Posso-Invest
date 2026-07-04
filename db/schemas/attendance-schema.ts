import { relations } from "drizzle-orm"
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import type { z } from "zod"

import { user } from "./auth-schema"
import { meeting } from "./meeting-schema"

export const attendanceStatusEnum = pgEnum("attendance_status", [
  "present",
  "absent",
  "excused",
  "late",
])

export const attendance = pgTable(
  "attendance",
  {
    id: text("id").primaryKey(),
    meetingId: text("meeting_id")
      .notNull()
      .references(() => meeting.id, { onDelete: "cascade" }),
    memberId: text("member_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: attendanceStatusEnum("status").notNull().default("present"),
    checkedInAt: timestamp("checked_in_at"),
    notes: text("notes"),
    recordedBy: text("recorded_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    meetingIdx: index("attendance_meeting_id_idx").on(table.meetingId),
    memberIdx: index("attendance_member_id_idx").on(table.memberId),
    statusIdx: index("attendance_status_idx").on(table.status),
    meetingMemberUnique: uniqueIndex("attendance_meeting_member_idx").on(
      table.meetingId,
      table.memberId
    ),
  })
)

export const attendanceRelations = relations(attendance, ({ one }) => ({
  meeting: one(meeting, {
    fields: [attendance.meetingId],
    references: [meeting.id],
  }),
  member: one(user, {
    fields: [attendance.memberId],
    references: [user.id],
    relationName: "memberAttendance",
  }),
  recorder: one(user, {
    fields: [attendance.recordedBy],
    references: [user.id],
    relationName: "attendanceRecordedBy",
  }),
}))

export const insertAttendanceSchema = createInsertSchema(attendance)
export const selectAttendanceSchema = createSelectSchema(attendance)

export type Attendance = z.infer<typeof selectAttendanceSchema>
export type NewAttendance = z.infer<typeof insertAttendanceSchema>
export type AttendanceStatus = "present" | "absent" | "excused" | "late"
