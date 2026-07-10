// db/schemas/penalty-schema.ts
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

import { organization } from "./auth-schema"
import { user } from "./auth-schema"
import { contribution } from "./contribution-schema"

export const penaltyStatusEnum = pgEnum("penalty_status", ["active", "waived"])

export const penalty = pgTable(
  "penalty",
  {
    id: text("id").primaryKey(),

    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    // Optional link to the contribution this penalty was raised from.
    // Null means the penalty was issued directly (standalone / disciplinary).
    contributionId: text("contribution_id").references(() => contribution.id, {
      onDelete: "set null",
    }),

    // The member who owes the penalty
    memberId: text("member_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    // Treasurer / admin who recorded the penalty
    issuedBy: text("issued_by").references(() => user.id, {
      onDelete: "set null",
    }),

    // Treasurer / admin who approved the waiver (null when active)
    waivedBy: text("waived_by").references(() => user.id, {
      onDelete: "set null",
    }),

    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("RWF").notNull(),

    status: penaltyStatusEnum("status").notNull().default("active"),

    // Human-readable explanation, e.g. "Late payment for period 2026-03"
    reason: text("reason"),

    // Waiver tracking
    waivedAt: timestamp("waived_at"),
    waivedReason: text("waived_reason"),

    notes: text("notes"),

    // Denormalized from contribution to allow direct filtering / display
    // without joining contributions on every query
    period: varchar("period", { length: 7 }).notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    organizationIdIdx: index("penalty_organization_id_idx").on(table.organizationId),
    contributionIdIdx: index("penalty_contribution_id_idx").on(
      table.contributionId
    ),
    memberIdIdx: index("penalty_member_id_idx").on(table.memberId),
    statusIdx: index("penalty_status_idx").on(table.status),
    periodIdx: index("penalty_period_idx").on(table.period),
  })
)

export const penaltyRelations = relations(penalty, ({ one }) => ({
  contribution: one(contribution, {
    fields: [penalty.contributionId],
    references: [contribution.id],
  }),
  member: one(user, {
    fields: [penalty.memberId],
    references: [user.id],
    relationName: "memberPenalties",
  }),
  issuedByUser: one(user, {
    fields: [penalty.issuedBy],
    references: [user.id],
    relationName: "penaltiesIssuedBy",
  }),
  waivedByUser: one(user, {
    fields: [penalty.waivedBy],
    references: [user.id],
    relationName: "penaltiesWaivedBy",
  }),
}))

export const insertPenaltySchema = createInsertSchema(penalty)
export const selectPenaltySchema = createSelectSchema(penalty)

export type Penalty = z.infer<typeof selectPenaltySchema>
export type NewPenalty = z.infer<typeof insertPenaltySchema>
export type PenaltyStatus = "active" | "waived"
