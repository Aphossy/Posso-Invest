// db/operations/minutes-operations.ts
import { db } from "@/db/connection"
import { meetingMinutes } from "@/db/schemas/minutes-schema"
import type {
  MeetingMinutes,
  MinutesStatus,
  NewMeetingMinutes,
} from "@/db/schemas/minutes-schema"
import { and, asc, count, desc, eq, inArray } from "drizzle-orm"

const minutesStatusOptions: MinutesStatus[] = [
  "draft",
  "finalized",
  "published",
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

export const minutesOperations = {
  async findById(id: string): Promise<MeetingMinutes | null> {
    const result = await db
      .select()
      .from(meetingMinutes)
      .where(eq(meetingMinutes.id, id))
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
    sortBy?: keyof MeetingMinutes
    sortOrder?: "asc" | "desc"
    filters?: {
      meetingId?: string
      status?: string | string[]
      recordedBy?: string
    }
  } = {}): Promise<MeetingMinutes[]> {
    let query = db.select().from(meetingMinutes)

    const conditions = []
    if (filters.meetingId)
      conditions.push(eq(meetingMinutes.meetingId, filters.meetingId))
    const statusFilters = normalizeEnumFilter(
      filters.status,
      minutesStatusOptions
    )
    if (statusFilters) {
      conditions.push(inArray(meetingMinutes.status, statusFilters))
    }
    if (filters.recordedBy)
      conditions.push(eq(meetingMinutes.recordedBy, filters.recordedBy))

    if (conditions.length > 0) {
      query = query.where(and(...conditions))
    }

    const sortColumn =
      meetingMinutes[sortBy as keyof typeof meetingMinutes] ??
      meetingMinutes.createdAt
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
      status?: string | string[]
    }
  } = {}): Promise<number> {
    let query = db.select({ count: count() }).from(meetingMinutes)

    const conditions = []
    if (filters.meetingId)
      conditions.push(eq(meetingMinutes.meetingId, filters.meetingId))
    const statusFilters = normalizeEnumFilter(
      filters.status,
      minutesStatusOptions
    )
    if (statusFilters) {
      conditions.push(inArray(meetingMinutes.status, statusFilters))
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions))
    }

    const [{ count: total }] = await query
    return total
  },

  async create(data: NewMeetingMinutes): Promise<MeetingMinutes> {
    const result = await db
      .insert(meetingMinutes)
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
    updates: Partial<MeetingMinutes>
  ): Promise<MeetingMinutes | null> {
    const result = await db
      .update(meetingMinutes)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(meetingMinutes.id, id))
      .returning()
    return result[0] || null
  },

  async deleteById(id: string): Promise<boolean> {
    const result = await db
      .delete(meetingMinutes)
      .where(eq(meetingMinutes.id, id))
    return result.rowCount > 0
  },
}
