import { db } from "@/db/connection"
import { announcement } from "@/db/schemas/announcement-schema"
import type {
  Announcement,
  AnnouncementAudience,
  AnnouncementStatus,
  NewAnnouncement,
} from "@/db/schemas/announcement-schema"
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
} from "drizzle-orm"

const announcementStatusOptions: AnnouncementStatus[] = [
  "draft",
  "published",
  "archived",
]

const announcementAudienceOptions: AnnouncementAudience[] = [
  "members",
  "committee",
  "public",
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

export const announcementOperations = {
  async findById(id: string): Promise<Announcement | null> {
    const result = await db
      .select()
      .from(announcement)
      .where(eq(announcement.id, id))
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
    sortBy?: keyof Announcement
    sortOrder?: "asc" | "desc"
    filters?: {
      status?: string | string[]
      audience?: string | string[]
      createdBy?: string
      pinned?: boolean
      search?: string
      createdAtFrom?: Date
      createdAtTo?: Date
      publishedFrom?: Date
      publishedTo?: Date
    }
  } = {}): Promise<Announcement[]> {
    let query = db.select().from(announcement)

    const conditions = []
    const statusFilters = normalizeEnumFilter(
      filters.status,
      announcementStatusOptions
    )
    if (statusFilters) {
      conditions.push(inArray(announcement.status, statusFilters))
    }
    const audienceFilters = normalizeEnumFilter(
      filters.audience,
      announcementAudienceOptions
    )
    if (audienceFilters) {
      conditions.push(inArray(announcement.audience, audienceFilters))
    }
    if (filters.createdBy)
      conditions.push(eq(announcement.createdBy, filters.createdBy))
    if (filters.pinned !== undefined)
      conditions.push(eq(announcement.pinned, filters.pinned))
    if (filters.search) {
      conditions.push(ilike(announcement.title, `%${filters.search}%`))
    }
    if (filters.createdAtFrom)
      conditions.push(gte(announcement.createdAt, filters.createdAtFrom))
    if (filters.createdAtTo)
      conditions.push(lte(announcement.createdAt, filters.createdAtTo))
    if (filters.publishedFrom)
      conditions.push(gte(announcement.publishedAt, filters.publishedFrom))
    if (filters.publishedTo)
      conditions.push(lte(announcement.publishedAt, filters.publishedTo))

    if (conditions.length > 0) {
      query = query.where(and(...conditions))
    }

    const sortColumn =
      announcement[sortBy as keyof typeof announcement] ??
      announcement.createdAt
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
      audience?: string | string[]
      createdBy?: string
      pinned?: boolean
    }
  } = {}): Promise<number> {
    let query = db.select({ count: count() }).from(announcement)

    const conditions = []
    const statusFilters = normalizeEnumFilter(
      filters.status,
      announcementStatusOptions
    )
    if (statusFilters) {
      conditions.push(inArray(announcement.status, statusFilters))
    }
    const audienceFilters = normalizeEnumFilter(
      filters.audience,
      announcementAudienceOptions
    )
    if (audienceFilters) {
      conditions.push(inArray(announcement.audience, audienceFilters))
    }
    if (filters.createdBy)
      conditions.push(eq(announcement.createdBy, filters.createdBy))
    if (filters.pinned !== undefined)
      conditions.push(eq(announcement.pinned, filters.pinned))

    if (conditions.length > 0) {
      query = query.where(and(...conditions))
    }

    const [{ count: total }] = await query
    return total
  },

  async create(data: NewAnnouncement): Promise<Announcement> {
    const result = await db
      .insert(announcement)
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
    updates: Partial<Announcement>
  ): Promise<Announcement | null> {
    const result = await db
      .update(announcement)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(announcement.id, id))
      .returning()
    return result[0] || null
  },

  async deleteById(id: string): Promise<boolean> {
    const result = await db.delete(announcement).where(eq(announcement.id, id))
    return result.rowCount > 0
  },
}
