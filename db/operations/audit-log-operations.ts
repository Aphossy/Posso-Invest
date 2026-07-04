/// db\operations\audit-log-operations.ts
import { db } from "@/db/connection"
import { auditLogs } from "@/db/schemas"
import type { AuditLog, NewAuditLog } from "@/db/schemas"
import { and, desc, eq } from "drizzle-orm"

// Enhanced Audit log operations
export const auditLogOperations = {
  async create(logData: NewAuditLog): Promise<AuditLog> {
    const result = await db
      .insert(auditLogs)
      .values({
        ...logData,
        createdAt: new Date(),
      })
      .returning()
    return result[0]
  },

  async findByUserId(
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset)
  },

  async findByAction(action: string, limit = 50): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, action))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
  },

  async findRecent(limit = 100): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
  },

  async findBySeverity(severity: string, limit = 50): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.severity, severity))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
  },

  async findByResourceId(
    resourceType: string,
    resourceId: string,
    limit = 100
  ): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.resourceType, resourceType),
          eq(auditLogs.resourceId, resourceId)
        )
      )
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
  },
}
