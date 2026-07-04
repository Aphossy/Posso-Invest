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

export const expenseCategoryEnum = pgEnum("expense_category", [
  "bank_charge",
  "notary",
  "transport",
  "office_supplies",
  "communication",
  "event",
  "other",
])

export const expenseStatusEnum = pgEnum("expense_status", [
  "pending",
  "approved",
  "rejected",
])

export const operationalExpense = pgTable(
  "operational_expense",
  {
    id: text("id").primaryKey(),
    submittedById: text("submitted_by_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("RWF").notNull(),
    category: expenseCategoryEnum("category").notNull().default("other"),
    description: text("description").notNull(),
    expenseDate: timestamp("expense_date").notNull(),
    receiptUrl: text("receipt_url"),
    status: expenseStatusEnum("status").notNull().default("pending"),
    approvedById: text("approved_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    approvedAt: timestamp("approved_at"),
    rejectionNote: text("rejection_note"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    submittedByIdx: index("operational_expense_submitted_by_idx").on(
      table.submittedById
    ),
    statusIdx: index("operational_expense_status_idx").on(table.status),
    categoryIdx: index("operational_expense_category_idx").on(table.category),
    expenseDateIdx: index("operational_expense_date_idx").on(table.expenseDate),
    createdAtIdx: index("operational_expense_created_at_idx").on(
      table.createdAt
    ),
  })
)

export const operationalExpenseRelations = relations(
  operationalExpense,
  ({ one }) => ({
    submittedBy: one(user, {
      fields: [operationalExpense.submittedById],
      references: [user.id],
      relationName: "submittedExpenses",
    }),
    approvedBy: one(user, {
      fields: [operationalExpense.approvedById],
      references: [user.id],
      relationName: "approvedExpenses",
    }),
  })
)

export const insertOperationalExpenseSchema =
  createInsertSchema(operationalExpense)
export const selectOperationalExpenseSchema =
  createSelectSchema(operationalExpense)

export type OperationalExpense = z.infer<typeof selectOperationalExpenseSchema>
export type NewOperationalExpense = z.infer<
  typeof insertOperationalExpenseSchema
>
export type ExpenseCategory =
  | "bank_charge"
  | "notary"
  | "transport"
  | "office_supplies"
  | "communication"
  | "event"
  | "other"
export type ExpenseStatus = "pending" | "approved" | "rejected"

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  bank_charge: "Bank / Mobile Money Charge",
  notary: "Notary / Legal",
  transport: "Transport",
  office_supplies: "Office Supplies",
  communication: "Communication",
  event: "Event / Meeting",
  other: "Other",
}
