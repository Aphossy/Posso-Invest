// C:\Users\user\OneDrive\Desktop\trustlink-group\db\operations\message-operations.ts
import { db } from "@/db/connection"
import {
  messageAttachments,
  messageResponses,
  messages,
} from "@/db/schemas/message-schema"
import type {
  Message,
  MessageAttachment,
  MessageResponse,
  NewMessage,
  NewMessageAttachment,
  NewMessageResponse,
} from "@/db/schemas/message-schema"
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  like,
  lte,
  or,
} from "drizzle-orm"

// ============================================
// MESSAGE OPERATIONS
// ============================================

export const messageOperations = {
  // Basic CRUD
  async findById(id: string): Promise<Message | null> {
    const result = await db
      .select()
      .from(messages)
      .where(eq(messages.id, id))
      .limit(1)
    return result[0] || null
  },

  async findByCode(code: string): Promise<Message | null> {
    const result = await db
      .select()
      .from(messages)
      .where(eq(messages.messageCode, code))
      .limit(1)
    return result[0] || null
  },

  async findLatestCodeForYear(year: number): Promise<string | null> {
    const prefix = `MSG-${year}-`
    const result = await db
      .select({ messageCode: messages.messageCode })
      .from(messages)
      .where(like(messages.messageCode, `${prefix}%`))
      .orderBy(desc(messages.messageCode))
      .limit(1)

    return result[0]?.messageCode ?? null
  },

  async findByEmail(email: string, limit = 20): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.email, email))
      .orderBy(desc(messages.createdAt))
      .limit(limit)
  },

  async findMany({
    limit = 50,
    offset = 0,
    sortBy = "createdAt",
    sortOrder = "desc",
    filters = {},
  }: {
    limit?: number
    offset?: number
    sortBy?: keyof Message
    sortOrder?: "asc" | "desc"
    filters?: any
  } = {}): Promise<Message[]> {
    let query = db.select().from(messages)

    // Build where conditions
    const conditions = []

    // Status filters
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        conditions.push(inArray(messages.status, filters.status))
      } else {
        conditions.push(eq(messages.status, filters.status))
      }
    }

    // Service type filters
    if (filters.service) {
      if (Array.isArray(filters.service)) {
        conditions.push(inArray(messages.service, filters.service))
      } else {
        conditions.push(eq(messages.service, filters.service))
      }
    }

    // Priority filters
    if (filters.priority) {
      if (Array.isArray(filters.priority)) {
        conditions.push(inArray(messages.priority, filters.priority))
      } else {
        conditions.push(eq(messages.priority, filters.priority))
      }
    }

    // Boolean flags
    if (filters.isRead !== undefined)
      conditions.push(eq(messages.isRead, filters.isRead))
    if (filters.isStarred !== undefined)
      conditions.push(eq(messages.isStarred, filters.isStarred))
    if (filters.isArchived !== undefined)
      conditions.push(eq(messages.isArchived, filters.isArchived))

    // Assignment filter
    if (filters.assignedTo) {
      if (filters.assignedTo === "unassigned") {
        conditions.push(isNull(messages.assignedTo))
      } else {
        conditions.push(eq(messages.assignedTo, filters.assignedTo))
      }
    }

    // Search filters
    if (filters.search) {
      conditions.push(
        or(
          like(messages.name, `%${filters.search}%`),
          like(messages.email, `%${filters.search}%`),
          like(messages.subject, `%${filters.search}%`),
          like(messages.message, `%${filters.search}%`),
          like(messages.messageCode, `%${filters.search}%`)
        )
      )
    }

    // Date filters
    if (filters.createdAtFrom)
      conditions.push(gte(messages.createdAt, filters.createdAtFrom))
    if (filters.createdAtTo)
      conditions.push(lte(messages.createdAt, filters.createdAtTo))

    if (conditions.length > 0) {
      query = query.where(and(...conditions))
    }

    // Sorting
    const sortColumn =
      messages[sortBy as keyof typeof messages] ?? messages.createdAt
    query = query.orderBy(
      sortOrder === "desc" ? desc(sortColumn as any) : asc(sortColumn as any)
    )

    // Pagination
    query = query.limit(limit).offset(offset)

    return await query
  },

  async count({
    filters = {},
  }: {
    filters?: any
  } = {}): Promise<number> {
    let query = db.select({ count: count() }).from(messages)

    // Build where conditions (same as in findMany)
    const conditions = []

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        conditions.push(inArray(messages.status, filters.status))
      } else {
        conditions.push(eq(messages.status, filters.status))
      }
    }

    if (filters.service) {
      if (Array.isArray(filters.service)) {
        conditions.push(inArray(messages.service, filters.service))
      } else {
        conditions.push(eq(messages.service, filters.service))
      }
    }

    if (filters.priority) {
      if (Array.isArray(filters.priority)) {
        conditions.push(inArray(messages.priority, filters.priority))
      } else {
        conditions.push(eq(messages.priority, filters.priority))
      }
    }

    if (filters.isRead !== undefined)
      conditions.push(eq(messages.isRead, filters.isRead))
    if (filters.isStarred !== undefined)
      conditions.push(eq(messages.isStarred, filters.isStarred))
    if (filters.isArchived !== undefined)
      conditions.push(eq(messages.isArchived, filters.isArchived))

    if (filters.assignedTo) {
      if (filters.assignedTo === "unassigned") {
        conditions.push(isNull(messages.assignedTo))
      } else {
        conditions.push(eq(messages.assignedTo, filters.assignedTo))
      }
    }

    if (filters.search) {
      conditions.push(
        or(
          like(messages.name, `%${filters.search}%`),
          like(messages.email, `%${filters.search}%`),
          like(messages.subject, `%${filters.search}%`),
          like(messages.message, `%${filters.search}%`),
          like(messages.messageCode, `%${filters.search}%`)
        )
      )
    }

    if (filters.createdAtFrom)
      conditions.push(gte(messages.createdAt, filters.createdAtFrom))
    if (filters.createdAtTo)
      conditions.push(lte(messages.createdAt, filters.createdAtTo))

    if (conditions.length > 0) {
      query = query.where(and(...conditions))
    }

    const [{ count: total }] = await query
    return total
  },

  async create(messageData: NewMessage): Promise<Message> {
    const result = await db
      .insert(messages)
      .values({
        ...messageData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()
    return result[0]
  },

  async updateById(
    id: string,
    updates: Partial<Message>
  ): Promise<Message | null> {
    const result = await db
      .update(messages)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(messages.id, id))
      .returning()
    return result[0] || null
  },

  async deleteById(id: string): Promise<boolean> {
    const result = await db.delete(messages).where(eq(messages.id, id))
    return result.rowCount > 0
  },

  // Status management
  async markAsRead(id: string): Promise<Message | null> {
    const result = await db
      .update(messages)
      .set({
        isRead: true,
        readAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(messages.id, id))
      .returning()
    return result[0] || null
  },

  async markAsUnread(id: string): Promise<Message | null> {
    const result = await db
      .update(messages)
      .set({
        isRead: false,
        readAt: null,
        updatedAt: new Date(),
      })
      .where(eq(messages.id, id))
      .returning()
    return result[0] || null
  },

  async toggleStar(id: string): Promise<Message | null> {
    const message = await this.findById(id)
    if (!message) return null

    const result = await db
      .update(messages)
      .set({
        isStarred: !message.isStarred,
        updatedAt: new Date(),
      })
      .where(eq(messages.id, id))
      .returning()
    return result[0] || null
  },

  async updateStatus(id: string, status: string): Promise<Message | null> {
    const updates: any = {
      status,
      updatedAt: new Date(),
    }

    // Auto-set resolved date if status is resolved
    if (status === "resolved") {
      updates.resolvedAt = new Date()
    }

    const result = await db
      .update(messages)
      .set(updates)
      .where(eq(messages.id, id))
      .returning()
    return result[0] || null
  },

  async assignTo(id: string, userId: string | null): Promise<Message | null> {
    const result = await db
      .update(messages)
      .set({
        assignedTo: userId,
        assignedAt: userId ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(messages.id, id))
      .returning()
    return result[0] || null
  },

  async archive(id: string): Promise<Message | null> {
    const result = await db
      .update(messages)
      .set({
        isArchived: true,
        updatedAt: new Date(),
      })
      .where(eq(messages.id, id))
      .returning()
    return result[0] || null
  },

  async unarchive(id: string): Promise<Message | null> {
    const result = await db
      .update(messages)
      .set({
        isArchived: false,
        updatedAt: new Date(),
      })
      .where(eq(messages.id, id))
      .returning()
    return result[0] || null
  },

  // Specialized queries
  async findUnread(limit = 50): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(and(eq(messages.isRead, false), eq(messages.isArchived, false)))
      .orderBy(desc(messages.createdAt))
      .limit(limit)
  },

  async findStarred(limit = 50): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.isStarred, true))
      .orderBy(desc(messages.createdAt))
      .limit(limit)
  },

  async findByStatus(status: string, limit = 50): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.status, status as any))
      .orderBy(desc(messages.createdAt))
      .limit(limit)
  },

  async findByPriority(priority: string, limit = 50): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.priority, priority as any))
      .orderBy(desc(messages.createdAt))
      .limit(limit)
  },

  // With relations
  async findByIdWithDetails(id: string): Promise<any> {
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, id))
      .limit(1)

    if (!message) return null

    const [responses, attachments] = await Promise.all([
      messageResponseOperations.findByMessageId(message.id),
      messageAttachmentOperations.findByMessageId(message.id),
    ])

    return {
      ...message,
      responses,
      attachments,
    }
  },

  // Statistics
  async getStats(): Promise<{
    total: number
    new: number
    read: number
    inProgress: number
    resolved: number
    archived: number
    byStatus: Record<string, number>
    byService: Record<string, number>
    byPriority: Record<string, number>
    starred: number
    unread: number
  }> {
    const [totalResult] = await db.select({ count: count() }).from(messages)

    const [newResult] = await db
      .select({ count: count() })
      .from(messages)
      .where(eq(messages.status, "new"))

    const [readResult] = await db
      .select({ count: count() })
      .from(messages)
      .where(eq(messages.isRead, true))

    const [inProgressResult] = await db
      .select({ count: count() })
      .from(messages)
      .where(eq(messages.status, "in-progress"))

    const [resolvedResult] = await db
      .select({ count: count() })
      .from(messages)
      .where(eq(messages.status, "resolved"))

    const [archivedResult] = await db
      .select({ count: count() })
      .from(messages)
      .where(eq(messages.isArchived, true))

    const [starredResult] = await db
      .select({ count: count() })
      .from(messages)
      .where(eq(messages.isStarred, true))

    const [unreadResult] = await db
      .select({ count: count() })
      .from(messages)
      .where(eq(messages.isRead, false))

    // Status distribution
    const statusStats = await db
      .select({ status: messages.status, count: count() })
      .from(messages)
      .groupBy(messages.status)

    const byStatus = statusStats.reduce(
      (acc: Record<string, number>, { status, count }: any) => {
        acc[status] = count
        return acc
      },
      {}
    )

    // Service distribution
    const serviceStats = await db
      .select({ service: messages.service, count: count() })
      .from(messages)
      .groupBy(messages.service)

    const byService = serviceStats.reduce(
      (acc: Record<string, number>, { service, count }: any) => {
        acc[service] = count
        return acc
      },
      {}
    )

    // Priority distribution
    const priorityStats = await db
      .select({ priority: messages.priority, count: count() })
      .from(messages)
      .groupBy(messages.priority)

    const byPriority = priorityStats.reduce(
      (acc: Record<string, number>, { priority, count }: any) => {
        if (priority) acc[priority] = count
        return acc
      },
      {}
    )

    return {
      total: totalResult.count,
      new: newResult.count,
      read: readResult.count,
      inProgress: inProgressResult.count,
      resolved: resolvedResult.count,
      archived: archivedResult.count,
      byStatus,
      byService,
      byPriority,
      starred: starredResult.count,
      unread: unreadResult.count,
    }
  },
}

// ============================================
// MESSAGE RESPONSE OPERATIONS
// ============================================

export const messageResponseOperations = {
  async findById(id: string): Promise<MessageResponse | null> {
    const result = await db
      .select()
      .from(messageResponses)
      .where(eq(messageResponses.id, id))
      .limit(1)
    return result[0] || null
  },

  async findByMessageId(
    messageId: string,
    limit = 100
  ): Promise<MessageResponse[]> {
    return await db
      .select()
      .from(messageResponses)
      .where(eq(messageResponses.messageId, messageId))
      .orderBy(asc(messageResponses.createdAt))
      .limit(limit)
  },

  async create(
    responseData: Omit<NewMessageResponse, "createdAt" | "updatedAt">
  ): Promise<MessageResponse> {
    const result = await db
      .insert(messageResponses)
      .values({
        ...responseData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    // Update message response count and last response timestamp
    const message = await messageOperations.findById(responseData.messageId)
    if (message) {
      await messageOperations.updateById(responseData.messageId, {
        responseCount: String(Number(message.responseCount || "0") + 1),
        lastResponseAt: new Date(),
      })
    }

    return result[0]
  },

  async updateById(
    id: string,
    content: string
  ): Promise<MessageResponse | null> {
    const result = await db
      .update(messageResponses)
      .set({
        content,
        updatedAt: new Date(),
      })
      .where(eq(messageResponses.id, id))
      .returning()
    return result[0] || null
  },

  async deleteById(id: string): Promise<boolean> {
    const result = await db
      .delete(messageResponses)
      .where(eq(messageResponses.id, id))
    return result.rowCount > 0
  },
}

// ============================================
// MESSAGE ATTACHMENT OPERATIONS
// ============================================

export const messageAttachmentOperations = {
  async findById(id: string): Promise<MessageAttachment | null> {
    const result = await db
      .select()
      .from(messageAttachments)
      .where(eq(messageAttachments.id, id))
      .limit(1)
    return result[0] || null
  },

  async findByMessageId(
    messageId: string,
    limit = 50
  ): Promise<MessageAttachment[]> {
    return await db
      .select()
      .from(messageAttachments)
      .where(eq(messageAttachments.messageId, messageId))
      .orderBy(desc(messageAttachments.createdAt))
      .limit(limit)
  },

  async create(
    attachmentData: Omit<NewMessageAttachment, "createdAt">
  ): Promise<MessageAttachment> {
    const result = await db
      .insert(messageAttachments)
      .values({
        ...attachmentData,
        createdAt: new Date(),
      })
      .returning()
    return result[0]
  },

  async deleteById(id: string): Promise<boolean> {
    const result = await db
      .delete(messageAttachments)
      .where(eq(messageAttachments.id, id))
    return result.rowCount > 0
  },
}

// ============================================
// EXPORTS
// ============================================

const messageOperationsExport = {
  messages: messageOperations,
  responses: messageResponseOperations,
  attachments: messageAttachmentOperations,
}

export default messageOperationsExport
