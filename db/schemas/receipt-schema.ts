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
import { contribution } from "./contribution-schema"

export const receiptTypeEnum = pgEnum("receipt_type", [
  "contribution",
  "loan_repayment",
  "penalty_payment",
  "registration_fee",
  "other",
])

export const receiptStatusEnum = pgEnum("receipt_status", [
  "issued",
  "void",
  "replaced",
])

export const receiptPaymentMethodEnum = pgEnum("receipt_payment_method", [
  "cash",
  "bank_transfer",
  "mobile_money",
  "check",
  "other",
])

export const receipt = pgTable(
  "receipt",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    // Human-readable unique number, e.g. TLG-R-2026-001
    receiptNumber: varchar("receipt_number", { length: 50 }).unique(),

    receiptType: receiptTypeEnum("receipt_type").notNull().default("other"),
    status: receiptStatusEnum("status").notNull().default("issued"),

    // Member this receipt is for
    memberId: text("member_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    // Treasurer/admin who issued it
    issuedBy: text("issued_by").references(() => user.id, {
      onDelete: "set null",
    }),

    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("RWF").notNull(),
    paymentMethod: receiptPaymentMethodEnum("payment_method").default("cash"),

    // Optional source record links
    contributionId: text("contribution_id").references(() => contribution.id, {
      onDelete: "set null",
    }),
    loanId: text("loan_id"), // references loan.id (no FK to avoid cycle issues)
    penaltyId: text("penalty_id"), // references penalty.id

    // Financial period, e.g. "2026-03"
    period: varchar("period", { length: 7 }),

    // Optional attached PDF/document
    fileUrl: text("file_url"),
    fileKey: text("file_key"),
    fileSize: integer("file_size"),
    fileType: varchar("file_type", { length: 100 }),

    notes: text("notes"),
    issuedAt: timestamp("issued_at").defaultNow().notNull(),
    downloadCount: integer("download_count").default(0),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    receiptNumberIdx: index("receipt_number_idx").on(table.receiptNumber),
    receiptTypeIdx: index("receipt_receipt_type_idx").on(table.receiptType),
    memberIdIdx: index("receipt_member_id_idx").on(table.memberId),
    issuedByIdx: index("receipt_issued_by_idx").on(table.issuedBy),
    statusIdx: index("receipt_status_idx").on(table.status),
    periodIdx: index("receipt_period_idx").on(table.period),
    contributionIdIdx: index("receipt_contribution_id_idx").on(
      table.contributionId
    ),
    issuedAtIdx: index("receipt_issued_at_idx").on(table.issuedAt),
  })
)

export const receiptRelations = relations(receipt, ({ one }) => ({
  member: one(user, {
    fields: [receipt.memberId],
    references: [user.id],
    relationName: "memberReceipts",
  }),
  issuedByUser: one(user, {
    fields: [receipt.issuedBy],
    references: [user.id],
    relationName: "receiptsIssuedBy",
  }),
  contribution: one(contribution, {
    fields: [receipt.contributionId],
    references: [contribution.id],
    relationName: "contributionReceipt",
  }),
}))

export const insertReceiptSchema = createInsertSchema(receipt)
export const selectReceiptSchema = createSelectSchema(receipt)

export type Receipt = z.infer<typeof selectReceiptSchema>
export type NewReceipt = z.infer<typeof insertReceiptSchema>
export type ReceiptType =
  | "contribution"
  | "loan_repayment"
  | "penalty_payment"
  | "registration_fee"
  | "other"
export type ReceiptStatus = "issued" | "void" | "replaced"
export type ReceiptPaymentMethod =
  | "cash"
  | "bank_transfer"
  | "mobile_money"
  | "check"
  | "other"
