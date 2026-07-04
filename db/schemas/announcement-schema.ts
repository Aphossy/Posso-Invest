import { relations } from "drizzle-orm"
import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import type { z } from "zod"

import { user } from "./auth-schema"

export const announcementStatusEnum = pgEnum("announcement_status", [
  "draft",
  "published",
  "archived",
])

export const announcementAudienceEnum = pgEnum("announcement_audience", [
  "members",
  "committee",
  "public",
])

export const announcement = pgTable(
  "announcement",
  {
    id: text("id").primaryKey(),
    title: varchar("title", { length: 160 }).notNull(),
    summary: text("summary"),
    content: text("content").notNull(),
    status: announcementStatusEnum("status").notNull().default("draft"),
    audience: announcementAudienceEnum("audience").notNull().default("members"),
    pinned: boolean("pinned").default(false).notNull(),
    publishedAt: timestamp("published_at"),
    expiresAt: timestamp("expires_at"),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    updatedBy: text("updated_by").references(() => user.id, {
      onDelete: "set null",
    }),
    metadata: jsonb("metadata").$type<{
      tags?: string[]
      attachments?: string[]
    }>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    statusIdx: index("announcement_status_idx").on(table.status),
    audienceIdx: index("announcement_audience_idx").on(table.audience),
    createdAtIdx: index("announcement_created_at_idx").on(table.createdAt),
    pinnedIdx: index("announcement_pinned_idx").on(table.pinned),
  })
)

export const announcementRelations = relations(announcement, ({ one }) => ({
  creator: one(user, {
    fields: [announcement.createdBy],
    references: [user.id],
    relationName: "announcementCreatedBy",
  }),
  updater: one(user, {
    fields: [announcement.updatedBy],
    references: [user.id],
    relationName: "announcementUpdatedBy",
  }),
}))

export const insertAnnouncementSchema = createInsertSchema(announcement)
export const selectAnnouncementSchema = createSelectSchema(announcement)

export type Announcement = z.infer<typeof selectAnnouncementSchema>
export type NewAnnouncement = z.infer<typeof insertAnnouncementSchema>
export type AnnouncementStatus = "draft" | "published" | "archived"
export type AnnouncementAudience = "members" | "committee" | "public"
