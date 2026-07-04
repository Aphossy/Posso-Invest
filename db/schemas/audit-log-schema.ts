// db\schemas\audit-log-schema.ts
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import z from "zod"

import { user } from "./auth-schema"

// Audit logs table with enhanced tracking - FIXED VARCHAR LENGTHS
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    action: varchar("action", { length: 100 }).notNull(),
    userId: text("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    userEmail: varchar("user_email", { length: 255 }),
    resourceType: varchar("resource_type", { length: 50 }),
    resourceId: varchar("resource_id", { length: 255 }),
    details: text("details"), // Changed from varchar to text
    metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"), // Changed from varchar to text
    sessionId: text("session_id"), // Changed from varchar to text
    severity: varchar("severity", { length: 20 }).default("info"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    actionIdx: index("audit_logs_action_idx").on(table.action),
    userIdIdx: index("audit_logs_user_id_idx").on(table.userId),
    resourceIdx: index("audit_logs_resource_idx").on(
      table.resourceType,
      table.resourceId
    ),
    severityIdx: index("audit_logs_severity_idx").on(table.severity),
    createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
  })
)

export const insertAuditLogSchema = createInsertSchema(auditLogs)
export const selectAuditLogSchema = createSelectSchema(auditLogs)

export type AuditLog = z.infer<typeof selectAuditLogSchema>
export type NewAuditLog = z.infer<typeof insertAuditLogSchema>

// Audit log severity enum
export enum AuditLogSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}
