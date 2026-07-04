// db/operations/meeting-operations.ts
import { db } from "@/db/connection"
import { meeting } from "@/db/schemas/meeting-schema"
import type {
  Meeting,
  MeetingStatus,
  NewMeeting,
} from "@/db/schemas/meeting-schema"
import { and, asc, count, desc, eq, gte, inArray, lte } from "drizzle-orm"

const meetingStatusOptions: MeetingStatus[] = [
  "scheduled",
  "completed",
  "cancelled",
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

export const meetingOperations = {
  async findById(id: string): Promise<Meeting | null> {
    const result = await db
      .select()
      .from(meeting)
      .where(eq(meeting.id, id))
      .limit(1)
    return result[0] || null
  },

  async findByIds(ids: string[]): Promise<Meeting[]> {
    if (!ids.length) return []
    return await db.select().from(meeting).where(inArray(meeting.id, ids))
  },

  async findMany({
    limit = 50,
    offset = 0,
    sortBy = "scheduledAt",
    sortOrder = "desc",
    filters = {},
  }: {
    limit?: number
    offset?: number
    sortBy?: keyof Meeting
    sortOrder?: "asc" | "desc"
    filters?: {
      status?: string | string[]
      scheduledFrom?: Date
      scheduledTo?: Date
    }
  } = {}): Promise<Meeting[]> {
    let query = db.select().from(meeting)

    const conditions = []
    const statusFilters = normalizeEnumFilter(
      filters.status,
      meetingStatusOptions
    )
    if (statusFilters) {
      conditions.push(inArray(meeting.status, statusFilters))
    }
    if (filters.scheduledFrom)
      conditions.push(gte(meeting.scheduledAt, filters.scheduledFrom))
    if (filters.scheduledTo)
      conditions.push(lte(meeting.scheduledAt, filters.scheduledTo))

    if (conditions.length > 0) {
      query = query.where(and(...conditions))
    }

    const sortColumn =
      meeting[sortBy as keyof typeof meeting] ?? meeting.scheduledAt
    query = query.orderBy(
      sortOrder === "desc" ? desc(sortColumn as any) : asc(sortColumn as any)
    )

    return await query.limit(limit).offset(offset)
  },

  async count({
    filters = {},
  }: {
    filters?: {
      status?: string | string[]
    }
  } = {}): Promise<number> {
    let query = db.select({ count: count() }).from(meeting)

    const conditions = []
    const statusFilters = normalizeEnumFilter(
      filters.status,
      meetingStatusOptions
    )
    if (statusFilters) {
      conditions.push(inArray(meeting.status, statusFilters))
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions))
    }

    const [{ count: total }] = await query
    return total
  },

  async create(data: NewMeeting): Promise<Meeting> {
    const result = await db
      .insert(meeting)
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
    updates: Partial<Meeting>
  ): Promise<Meeting | null> {
    const result = await db
      .update(meeting)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(meeting.id, id))
      .returning()
    return result[0] || null
  },

  async deleteById(id: string): Promise<boolean> {
    const result = await db.delete(meeting).where(eq(meeting.id, id))
    return result.rowCount > 0
  },
}
