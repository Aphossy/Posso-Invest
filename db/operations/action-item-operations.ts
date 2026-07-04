import { db } from "@/db/connection"
import { actionItem } from "@/db/schemas/action-item-schema"
import type {
  ActionItem,
  ActionItemPriority,
  ActionItemStatus,
  NewActionItem,
} from "@/db/schemas/action-item-schema"
import { and, asc, count, desc, eq, gte, inArray, lte } from "drizzle-orm"

const actionItemStatusOptions: ActionItemStatus[] = [
  "open",
  "in_progress",
  "blocked",
  "done",
  "cancelled",
]

const actionItemPriorityOptions: ActionItemPriority[] = [
  "low",
  "medium",
  "high",
  "urgent",
]

const normalizeEnumFilter = <T extends string>(
  value: string | string[] | undefined,
  allowed: readonly T[]
): T[] | undefined => {
  if (!value) return undefined
  const values = Array.isArray(value) ? value : [value]
  const filtered = values.filter((item): item is T =>
    allowed.includes(item as T)
  )
  return filtered.length ? filtered : undefined
}

export const actionItemOperations = {
  async findById(id: string): Promise<ActionItem | null> {
    const result = await db
      .select()
      .from(actionItem)
      .where(eq(actionItem.id, id))
      .limit(1)
    return result[0] || null
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
    sortBy?: keyof ActionItem
    sortOrder?: "asc" | "desc"
    filters?: {
      meetingId?: string
      minutesId?: string
      ownerId?: string
      status?: string | string[]
      priority?: string | string[]
      createdBy?: string
      dueFrom?: Date
      dueTo?: Date
    }
  } = {}): Promise<ActionItem[]> {
    let query = db.select().from(actionItem)

    const conditions = []
    if (filters.meetingId)
      conditions.push(eq(actionItem.meetingId, filters.meetingId))
    if (filters.minutesId)
      conditions.push(eq(actionItem.minutesId, filters.minutesId))
    if (filters.ownerId)
      conditions.push(eq(actionItem.ownerId, filters.ownerId))
    const statusFilters = normalizeEnumFilter(
      filters.status,
      actionItemStatusOptions
    )
    if (statusFilters) {
      conditions.push(inArray(actionItem.status, statusFilters))
    }
    const priorityFilters = normalizeEnumFilter(
      filters.priority,
      actionItemPriorityOptions
    )
    if (priorityFilters) {
      conditions.push(inArray(actionItem.priority, priorityFilters))
    }
    if (filters.createdBy)
      conditions.push(eq(actionItem.createdBy, filters.createdBy))
    if (filters.dueFrom)
      conditions.push(gte(actionItem.dueDate, filters.dueFrom))
    if (filters.dueTo) conditions.push(lte(actionItem.dueDate, filters.dueTo))

    if (conditions.length > 0) {
      query = query.where(and(...conditions))
    }

    const sortColumn =
      actionItem[sortBy as keyof typeof actionItem] ?? actionItem.createdAt
    query = query.orderBy(
      sortOrder === "desc" ? desc(sortColumn as any) : asc(sortColumn as any)
    )

    return await query.limit(limit).offset(offset)
  },

  async count({
    filters = {},
  }: {
    filters?: {
      meetingId?: string
      minutesId?: string
      ownerId?: string
      status?: string | string[]
      priority?: string | string[]
      createdBy?: string
    }
  } = {}): Promise<number> {
    let query = db.select({ count: count() }).from(actionItem)

    const conditions = []
    if (filters.meetingId)
      conditions.push(eq(actionItem.meetingId, filters.meetingId))
    if (filters.minutesId)
      conditions.push(eq(actionItem.minutesId, filters.minutesId))
    if (filters.ownerId)
      conditions.push(eq(actionItem.ownerId, filters.ownerId))
    const statusFilters = normalizeEnumFilter(
      filters.status,
      actionItemStatusOptions
    )
    if (statusFilters) {
      conditions.push(inArray(actionItem.status, statusFilters))
    }
    const priorityFilters = normalizeEnumFilter(
      filters.priority,
      actionItemPriorityOptions
    )
    if (priorityFilters) {
      conditions.push(inArray(actionItem.priority, priorityFilters))
    }
    if (filters.createdBy)
      conditions.push(eq(actionItem.createdBy, filters.createdBy))

    if (conditions.length > 0) {
      query = query.where(and(...conditions))
    }

    const [{ count: total }] = await query
    return total
  },

  async create(data: NewActionItem): Promise<ActionItem> {
    const result = await db
      .insert(actionItem)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()
    return result[0]
  },

  async updateById(
    id: string,
    updates: Partial<ActionItem>
  ): Promise<ActionItem | null> {
    const result = await db
      .update(actionItem)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(actionItem.id, id))
      .returning()
    return result[0] || null
  },

  async deleteById(id: string): Promise<boolean> {
    const result = await db.delete(actionItem).where(eq(actionItem.id, id))
    return result.rowCount > 0
  },
}
