// db/schemas/contribution-schema.ts
import { relations } from "drizzle-orm"
import {
  decimal,
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

import { organization } from "./auth-schema"
import { user } from "./auth-schema"

type ContributionAttachment = {
  id: string
  name: string
  url: string
  signedUrl?: string
  size: number
  type: string
  key?: string
  dbId?: string
  storageProvider?: string
  publicId?: string
  width?: number
  height?: number
  format?: string
  thumbnailUrl?: string
  mediumUrl?: string
}

export const contributionStatusEnum = pgEnum("contribution_status", [
  "pending",
  "confirmed",
  "late",
  "waived",
])

export const contribution = pgTable(
  "contribution",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    memberId: text("member_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    recordedBy: text("recorded_by").references(() => user.id, {
      onDelete: "set null",
    }),

    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("RWF").notNull(),
    period: varchar("period", { length: 7 }).notNull(),
    status: contributionStatusEnum("status").notNull().default("pending"),

    dueDate: timestamp("due_date"),
    paidAt: timestamp("paid_at"),
    penaltyAmount: decimal("penalty_amount", {
      precision: 10,
      scale: 2,
    }).default("0"),
    receiptNumber: varchar("receipt_number", { length: 50 }),
    notes: text("notes"),

    metadata: jsonb("metadata").$type<{
      paymentMethod?: string
      recordedByRole?: string
      attachments?: ContributionAttachment[]
      lastUpdatedById?: string
      lastUpdatedByName?: string
      lastUpdatedAt?: string
    }>(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    organizationIdIdx: index("contribution_organization_id_idx").on(table.organizationId),
    memberIdIdx: index("contribution_member_id_idx").on(table.memberId),
    statusIdx: index("contribution_status_idx").on(table.status),
    periodIdx: index("contribution_period_idx").on(table.period),
    createdAtIdx: index("contribution_created_at_idx").on(table.createdAt),
  })
)

export const contributionRelations = relations(contribution, ({ one }) => ({
  member: one(user, {
    fields: [contribution.memberId],
    references: [user.id],
    relationName: "memberContributions",
  }),
  recorder: one(user, {
    fields: [contribution.recordedBy],
    references: [user.id],
    relationName: "contributionRecordedBy",
  }),
}))

export const insertContributionSchema = createInsertSchema(contribution)
export const selectContributionSchema = createSelectSchema(contribution)

export type Contribution = z.infer<typeof selectContributionSchema>
export type NewContribution = z.infer<typeof insertContributionSchema>
export type ContributionStatus = "pending" | "confirmed" | "late" | "waived"
