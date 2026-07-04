// db/schemas/share-out-schema.ts
// Year-end share-out (payout) of the group fund to members.
//
// A `share_out` is one distribution cycle; each member gets a
// `share_out_allocation` row computed from their contribution base, less
// outstanding loan and penalty obligations.
import { relations } from "drizzle-orm"
import {
  decimal,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import type { z } from "zod"

import { user } from "./auth-schema"

export const shareOutStatusEnum = pgEnum("share_out_status", [
  "draft",
  "approved",
  "distributed",
  "cancelled",
])

export const shareOutAllocationStatusEnum = pgEnum(
  "share_out_allocation_status",
  ["pending", "paid"]
)

export const shareOut = pgTable(
  "share_out",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    label: varchar("label", { length: 160 }).notNull(),
    fiscalYear: integer("fiscal_year").notNull(),
    status: shareOutStatusEnum("status").notNull().default("draft"),
    currency: varchar("currency", { length: 3 }).default("RWF").notNull(),

    // The pool of cash being shared out (set by the treasurer at creation).
    distributableAmount: decimal("distributable_amount", {
      precision: 12,
      scale: 2,
    }).notNull(),

    // Snapshot totals computed when the draft is built.
    totalContributionBase: decimal("total_contribution_base", {
      precision: 12,
      scale: 2,
    })
      .default("0")
      .notNull(),
    totalGross: decimal("total_gross", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    totalDeductions: decimal("total_deductions", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    totalNet: decimal("total_net", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    memberCount: integer("member_count").default(0).notNull(),

    notes: text("notes"),

    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    approvedBy: text("approved_by").references(() => user.id, {
      onDelete: "set null",
    }),
    approvedAt: timestamp("approved_at"),
    distributedAt: timestamp("distributed_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    statusIdx: index("share_out_status_idx").on(table.status),
    fiscalYearIdx: index("share_out_fiscal_year_idx").on(table.fiscalYear),
  })
)

export const shareOutAllocation = pgTable(
  "share_out_allocation",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    shareOutId: text("share_out_id")
      .notNull()
      .references(() => shareOut.id, { onDelete: "cascade" }),
    memberId: text("member_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    contributionBase: decimal("contribution_base", {
      precision: 12,
      scale: 2,
    })
      .default("0")
      .notNull(),
    sharePercent: decimal("share_percent", { precision: 7, scale: 4 })
      .default("0")
      .notNull(),
    grossShare: decimal("gross_share", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    loanDeduction: decimal("loan_deduction", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    penaltyDeduction: decimal("penalty_deduction", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    netShare: decimal("net_share", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),

    status: shareOutAllocationStatusEnum("status").notNull().default("pending"),
    paidAt: timestamp("paid_at"),
    receiptId: text("receipt_id"),
    notes: text("notes"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    shareOutIdIdx: index("share_out_allocation_share_out_id_idx").on(
      table.shareOutId
    ),
    memberIdIdx: index("share_out_allocation_member_id_idx").on(table.memberId),
  })
)

export const shareOutRelations = relations(shareOut, ({ one, many }) => ({
  creator: one(user, {
    fields: [shareOut.createdBy],
    references: [user.id],
    relationName: "shareOutCreatedBy",
  }),
  approver: one(user, {
    fields: [shareOut.approvedBy],
    references: [user.id],
    relationName: "shareOutApprovedBy",
  }),
  allocations: many(shareOutAllocation),
}))

export const shareOutAllocationRelations = relations(
  shareOutAllocation,
  ({ one }) => ({
    shareOut: one(shareOut, {
      fields: [shareOutAllocation.shareOutId],
      references: [shareOut.id],
    }),
    member: one(user, {
      fields: [shareOutAllocation.memberId],
      references: [user.id],
      relationName: "memberShareOutAllocations",
    }),
  })
)

export const insertShareOutSchema = createInsertSchema(shareOut)
export const selectShareOutSchema = createSelectSchema(shareOut)
export const insertShareOutAllocationSchema =
  createInsertSchema(shareOutAllocation)
export const selectShareOutAllocationSchema =
  createSelectSchema(shareOutAllocation)

export type ShareOut = z.infer<typeof selectShareOutSchema>
export type NewShareOut = z.infer<typeof insertShareOutSchema>
export type ShareOutAllocation = z.infer<typeof selectShareOutAllocationSchema>
export type NewShareOutAllocation = z.infer<
  typeof insertShareOutAllocationSchema
>
export type ShareOutStatus = "draft" | "approved" | "distributed" | "cancelled"
export type ShareOutAllocationStatus = "pending" | "paid"
