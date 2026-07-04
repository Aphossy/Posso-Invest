import { relations } from "drizzle-orm"
import {
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

export const financialDocTypeEnum = pgEnum("financial_doc_type", [
  "monthly_report",
  "balance_sheet",
  "income_statement",
  "contribution_schedule",
  "loan_agreement",
  "disbursement_record",
  "repayment_schedule",
  "audit_report",
  "bank_statement",
  "budget",
  "other",
])

export const financialDocStatusEnum = pgEnum("financial_doc_status", [
  "draft",
  "published",
  "archived",
])

export const financialDocVisibilityEnum = pgEnum("financial_doc_visibility", [
  "public",
  "authenticated",
  "committee",
  "private",
])

export const financialDocument = pgTable(
  "financial_document",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),

    docType: financialDocTypeEnum("doc_type").notNull().default("other"),
    status: financialDocStatusEnum("status").notNull().default("draft"),
    visibility: financialDocVisibilityEnum("visibility")
      .notNull()
      .default("committee"),

    // Financial period this document covers, e.g. "2026-03"
    period: varchar("period", { length: 7 }),
    fiscalYear: integer("fiscal_year"),

    // Attached file
    fileUrl: text("file_url"),
    fileKey: text("file_key"),
    fileSize: integer("file_size"),
    fileType: varchar("file_type", { length: 100 }),

    // Treasurer/admin who uploaded it
    uploadedBy: text("uploaded_by").references(() => user.id, {
      onDelete: "set null",
    }),

    downloadCount: integer("download_count").default(0),
    notes: text("notes"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    docTypeIdx: index("fin_doc_type_idx").on(table.docType),
    statusIdx: index("fin_doc_status_idx").on(table.status),
    periodIdx: index("fin_doc_period_idx").on(table.period),
    fiscalYearIdx: index("fin_doc_fiscal_year_idx").on(table.fiscalYear),
    uploadedByIdx: index("fin_doc_uploaded_by_idx").on(table.uploadedBy),
    createdAtIdx: index("fin_doc_created_at_idx").on(table.createdAt),
  })
)

export const financialDocumentRelations = relations(
  financialDocument,
  ({ one }) => ({
    uploader: one(user, {
      fields: [financialDocument.uploadedBy],
      references: [user.id],
      relationName: "financialDocumentsBy",
    }),
  })
)

export const insertFinancialDocumentSchema =
  createInsertSchema(financialDocument)
export const selectFinancialDocumentSchema =
  createSelectSchema(financialDocument)

export type FinancialDocument = z.infer<typeof selectFinancialDocumentSchema>
export type NewFinancialDocument = z.infer<typeof insertFinancialDocumentSchema>
export type FinancialDocType =
  | "monthly_report"
  | "balance_sheet"
  | "income_statement"
  | "contribution_schedule"
  | "loan_agreement"
  | "disbursement_record"
  | "repayment_schedule"
  | "audit_report"
  | "bank_statement"
  | "budget"
  | "other"
export type FinancialDocStatus = "draft" | "published" | "archived"
