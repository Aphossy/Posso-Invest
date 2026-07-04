import { db } from "@/db/connection"
import { attendance } from "@/db/schemas/attendance-schema"
import type {
  Attendance,
  AttendanceStatus,
  NewAttendance,
} from "@/db/schemas/attendance-schema"
import { and, asc, count, desc, eq, gte, inArray, lte } from "drizzle-orm"

const attendanceStatusOptions: AttendanceStatus[] = [
  "present",
  "absent",
  "excused",
  "late",
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

export const attendanceOperations = {
  async findById(id: string): Promise<Attendance | null> {
    const result = await db
      .select()
      .from(attendance)
      .where(eq(attendance.id, id))
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
    sortBy?: keyof Attendance
    sortOrder?: "asc" | "desc"
    filters?: {
      meetingId?: string
      memberId?: string
      status?: string | string[]
      recordedBy?: string
      checkedInFrom?: Date
      checkedInTo?: Date
    }
  } = {}): Promise<Attendance[]> {
    let query = db.select().from(attendance)

    const conditions = []
    if (filters.meetingId)
      conditions.push(eq(attendance.meetingId, filters.meetingId))
    if (filters.memberId)
      conditions.push(eq(attendance.memberId, filters.memberId))
    const statusFilters = normalizeEnumFilter(
      filters.status,
      attendanceStatusOptions
    )
    if (statusFilters) {
      conditions.push(inArray(attendance.status, statusFilters))
    }
    if (filters.recordedBy)
      conditions.push(eq(attendance.recordedBy, filters.recordedBy))
    if (filters.checkedInFrom)
      conditions.push(gte(attendance.checkedInAt, filters.checkedInFrom))
    if (filters.checkedInTo)
      conditions.push(lte(attendance.checkedInAt, filters.checkedInTo))

    if (conditions.length > 0) {
      query = query.where(and(...conditions))
    }

    const sortColumn =
      attendance[sortBy as keyof typeof attendance] ?? attendance.createdAt
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
      memberId?: string
      status?: string | string[]
      recordedBy?: string
    }
  } = {}): Promise<number> {
    let query = db.select({ count: count() }).from(attendance)

    const conditions = []
    if (filters.meetingId)
      conditions.push(eq(attendance.meetingId, filters.meetingId))
    if (filters.memberId)
      conditions.push(eq(attendance.memberId, filters.memberId))
    const statusFilters = normalizeEnumFilter(
      filters.status,
      attendanceStatusOptions
    )
    if (statusFilters) {
      conditions.push(inArray(attendance.status, statusFilters))
    }
    if (filters.recordedBy)
      conditions.push(eq(attendance.recordedBy, filters.recordedBy))

    if (conditions.length > 0) {
      query = query.where(and(...conditions))
    }

    const [{ count: total }] = await query
    return total
  },

  async create(data: NewAttendance): Promise<Attendance> {
    const result = await db
      .insert(attendance)
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
    updates: Partial<Attendance>
  ): Promise<Attendance | null> {
    const result = await db
      .update(attendance)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(attendance.id, id))
      .returning()
    return result[0] || null
  },

  async deleteById(id: string): Promise<boolean> {
    const result = await db.delete(attendance).where(eq(attendance.id, id))
    return result.rowCount > 0
  },
}
