import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import type { z } from "zod"

import { organization, user } from "./auth-schema"

export const bankAccount = pgTable(
  "bank_account",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    accountName: varchar("account_name", { length: 120 }).notNull(),
    bankName: varchar("bank_name", { length: 120 }).notNull(),
    accountNumber: text("account_number").notNull(),
    accountHolder: varchar("account_holder", { length: 120 }).notNull(),
    accountType: varchar("account_type", { length: 20 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("RWF"),
    branch: varchar("branch", { length: 120 }),
    isActive: boolean("is_active").notNull().default(true),
    createdById: text("created_by_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    organizationIdx: index("bank_account_organization_idx").on(
      table.organizationId
    ),
    organizationAccountUnique: uniqueIndex(
      "bank_account_organization_number_uidx"
    ).on(table.organizationId, table.bankName, table.accountNumber),
  })
)

export const insertBankAccountSchema = createInsertSchema(bankAccount)
export const selectBankAccountSchema = createSelectSchema(bankAccount)

export type BankAccount = z.infer<typeof selectBankAccountSchema>
export type NewBankAccount = z.infer<typeof insertBankAccountSchema>
