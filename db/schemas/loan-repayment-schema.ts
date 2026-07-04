// db/schemas/loan-repayment-schema.ts
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
import { loan } from "./loan-schema"

export const loanRepaymentMethodEnum = pgEnum("loan_repayment_method", [
  "cash",
  "bank_transfer",
  "mobile_money",
  "check",
  "other",
])

export const loanRepayment = pgTable(
  "loan_repayment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    loanId: text("loan_id")
      .notNull()
      .references(() => loan.id, { onDelete: "cascade" }),

    // Denormalized from the loan for fast per-member queries
    memberId: text("member_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    // Treasurer/admin/president who recorded the payment
    recordedBy: text("recorded_by").references(() => user.id, {
      onDelete: "set null",
    }),

    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("RWF").notNull(),
    paymentMethod: loanRepaymentMethodEnum("payment_method").default("cash"),

    paidAt: timestamp("paid_at").defaultNow().notNull(),
    // Financial period, e.g. "2026-03"
    period: varchar("period", { length: 7 }),

    // Optional link to the generated receipt
    receiptId: text("receipt_id"),

    notes: text("notes"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    loanIdIdx: index("loan_repayment_loan_id_idx").on(table.loanId),
    memberIdIdx: index("loan_repayment_member_id_idx").on(table.memberId),
    paidAtIdx: index("loan_repayment_paid_at_idx").on(table.paidAt),
  })
)

export const loanRepaymentRelations = relations(loanRepayment, ({ one }) => ({
  loan: one(loan, {
    fields: [loanRepayment.loanId],
    references: [loan.id],
    relationName: "loanRepayments",
  }),
  member: one(user, {
    fields: [loanRepayment.memberId],
    references: [user.id],
    relationName: "memberLoanRepayments",
  }),
  recordedByUser: one(user, {
    fields: [loanRepayment.recordedBy],
    references: [user.id],
    relationName: "loanRepaymentsRecordedBy",
  }),
}))

export const insertLoanRepaymentSchema = createInsertSchema(loanRepayment)
export const selectLoanRepaymentSchema = createSelectSchema(loanRepayment)

export type LoanRepayment = z.infer<typeof selectLoanRepaymentSchema>
export type NewLoanRepayment = z.infer<typeof insertLoanRepaymentSchema>
export type LoanRepaymentMethod =
  | "cash"
  | "bank_transfer"
  | "mobile_money"
  | "check"
  | "other"
