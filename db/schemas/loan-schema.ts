// db/schemas/loan-schema.ts
import { relations } from "drizzle-orm"
import {
  decimal,
  index,
  integer,
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

export const loanStatusEnum = pgEnum("loan_status", [
  "requested",
  "approved",
  "rejected",
  "disbursed",
  "repaying",
  "repaid",
  "overdue",
])

export const loan = pgTable(
  "loan",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    memberId: text("member_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    approvedBy: text("approved_by").references(() => user.id, {
      onDelete: "set null",
    }),
    disbursedBy: text("disbursed_by").references(() => user.id, {
      onDelete: "set null",
    }),

    requestedAmount: decimal("requested_amount", {
      precision: 10,
      scale: 2,
    }).notNull(),
    approvedAmount: decimal("approved_amount", {
      precision: 10,
      scale: 2,
    }),
    currency: varchar("currency", { length: 3 }).default("RWF").notNull(),
    interestRate: decimal("interest_rate", {
      precision: 5,
      scale: 4,
    })
      .default("0.05")
      .notNull(),
    termMonths: integer("term_months"),

    status: loanStatusEnum("status").notNull().default("requested"),
    requestedAt: timestamp("requested_at").defaultNow().notNull(),
    approvedAt: timestamp("approved_at"),
    disbursedAt: timestamp("disbursed_at"),
    repaidAt: timestamp("repaid_at"),
    dueDate: timestamp("due_date"),

    notes: text("notes"),
    metadata: jsonb("metadata").$type<{
      reason?: string
      repaymentPlan?: string
    }>(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    organizationIdIdx: index("loan_organization_id_idx").on(table.organizationId),
    memberIdIdx: index("loan_member_id_idx").on(table.memberId),
    statusIdx: index("loan_status_idx").on(table.status),
    requestedAtIdx: index("loan_requested_at_idx").on(table.requestedAt),
  })
)

export const loanRelations = relations(loan, ({ one }) => ({
  member: one(user, {
    fields: [loan.memberId],
    references: [user.id],
    relationName: "memberLoans",
  }),
  approver: one(user, {
    fields: [loan.approvedBy],
    references: [user.id],
    relationName: "loanApprovedBy",
  }),
  disburser: one(user, {
    fields: [loan.disbursedBy],
    references: [user.id],
    relationName: "loanDisbursedBy",
  }),
}))

export const insertLoanSchema = createInsertSchema(loan)
export const selectLoanSchema = createSelectSchema(loan)

export type Loan = z.infer<typeof selectLoanSchema>
export type NewLoan = z.infer<typeof insertLoanSchema>
export type LoanStatus =
  | "requested"
  | "approved"
  | "rejected"
  | "disbursed"
  | "repaying"
  | "repaid"
  | "overdue"
