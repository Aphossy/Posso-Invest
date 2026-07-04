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

export const letterTypeEnum = pgEnum("letter_type", [
  "approval_request",
  "official_notice",
  "legal_notice",
  "meeting_notice",
  "member_communication",
  "general_correspondence",
])

export const letterStatusEnum = pgEnum("letter_status", [
  "draft",
  "sent",
  "acknowledged",
  "pending_signature",
  "signed",
  "approved",
  "rejected",
  "archived",
])

export const letterVisibilityEnum = pgEnum("letter_visibility", [
  "public",
  "authenticated",
  "committee",
  "private",
])

export const letter = pgTable(
  "letter",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    // Human-readable reference e.g. TLG/L/2026/001
    refNumber: varchar("ref_number", { length: 50 }),

    subject: varchar("subject", { length: 500 }).notNull(),
    letterType: letterTypeEnum("letter_type")
      .notNull()
      .default("general_correspondence"),
    status: letterStatusEnum("status").notNull().default("draft"),
    visibility: letterVisibilityEnum("visibility")
      .notNull()
      .default("committee"),

    // Who the letter is addressed to
    recipient: varchar("recipient", { length: 500 }),
    recipientMemberId: text("recipient_member_id").references(() => user.id, {
      onDelete: "set null",
    }),

    // Secretary/admin who issued it
    issuedBy: text("issued_by").references(() => user.id, {
      onDelete: "set null",
    }),

    // Attached document file
    fileUrl: text("file_url"),
    fileKey: text("file_key"),
    fileSize: integer("file_size"),
    fileType: varchar("file_type", { length: 100 }),

    description: text("description"),
    notes: text("notes"),

    issuedAt: timestamp("issued_at"),
    // For letters requiring a response
    dueDate: timestamp("due_date"),

    downloadCount: integer("download_count").default(0),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    refNumberIdx: index("letter_ref_number_idx").on(table.refNumber),
    letterTypeIdx: index("letter_letter_type_idx").on(table.letterType),
    statusIdx: index("letter_status_idx").on(table.status),
    issuedByIdx: index("letter_issued_by_idx").on(table.issuedBy),
    recipientMemberIdx: index("letter_recipient_member_idx").on(
      table.recipientMemberId
    ),
    createdAtIdx: index("letter_created_at_idx").on(table.createdAt),
  })
)

export const letterRelations = relations(letter, ({ one }) => ({
  issuedByUser: one(user, {
    fields: [letter.issuedBy],
    references: [user.id],
    relationName: "lettersIssuedBy",
  }),
  recipientMember: one(user, {
    fields: [letter.recipientMemberId],
    references: [user.id],
    relationName: "lettersRecipient",
  }),
}))

export const insertLetterSchema = createInsertSchema(letter)
export const selectLetterSchema = createSelectSchema(letter)

export type Letter = z.infer<typeof selectLetterSchema>
export type NewLetter = z.infer<typeof insertLetterSchema>
export type LetterType =
  | "approval_request"
  | "official_notice"
  | "legal_notice"
  | "meeting_notice"
  | "member_communication"
  | "general_correspondence"
export type LetterStatus =
  | "draft"
  | "sent"
  | "acknowledged"
  | "pending_signature"
  | "signed"
  | "approved"
  | "rejected"
  | "archived"
