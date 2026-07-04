import { db } from "@/db/connection"
import { letter } from "@/db/schemas/letter-schema"
import type {
  Letter,
  LetterStatus,
  LetterType,
  NewLetter,
} from "@/db/schemas/letter-schema"
import { and, asc, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm"

const letterTypeOptions: LetterType[] = [
  "approval_request",
  "official_notice",
  "legal_notice",
  "meeting_notice",
  "member_communication",
  "general_correspondence",
]

const letterStatusOptions: LetterStatus[] = [
  "draft",
  "sent",
  "acknowledged",
  "approved",
  "rejected",
  "archived",
]

function normalizeEnum<T extends string>(
  value: string | string[] | undefined,
  allowed: readonly T[]
): T[] | undefined {
  if (!value) return undefined
  const values = Array.isArray(value) ? value : [value]
  const filtered = values.filter((v): v is T => allowed.includes(v as T))
  return filtered.length ? filtered : undefined
}

export const letterOperations = {
  async findById(id: string): Promise<Letter | null> {
    const result = await db
      .select()
      .from(letter)
      .where(eq(letter.id, id))
      .limit(1)
    return result[0] || null
  },

  async findMany({
    limit = 20,
    offset = 0,
    sortBy = "createdAt",
    sortOrder = "desc",
    filters = {},
  }: {
    limit?: number
    offset?: number
    sortBy?: keyof Letter
    sortOrder?: "asc" | "desc"
    filters?: {
      issuedBy?: string
      recipientMemberId?: string
      letterType?: string | string[]
      status?: string | string[]
      search?: string
      visibility?: string
    }
  } = {}): Promise<Letter[]> {
    let query = db.select().from(letter) as any

    const conditions = []
    if (filters.issuedBy) conditions.push(eq(letter.issuedBy, filters.issuedBy))
    if (filters.recipientMemberId)
      conditions.push(eq(letter.recipientMemberId, filters.recipientMemberId))

    const typeFilters = normalizeEnum(filters.letterType, letterTypeOptions)
    if (typeFilters) conditions.push(inArray(letter.letterType, typeFilters))

    const statusFilters = normalizeEnum(filters.status, letterStatusOptions)
    if (statusFilters) conditions.push(inArray(letter.status, statusFilters))

    if (filters.visibility)
      conditions.push(eq(letter.visibility, filters.visibility as any))

    if (filters.search) {
      const term = `%${filters.search}%`
      conditions.push(
        or(
          ilike(letter.subject, term),
          ilike(letter.recipient, term),
          ilike(letter.refNumber, term),
          ilike(letter.description, term)
        )
      )
    }

    if (conditions.length > 0) query = query.where(and(...conditions))

    const sortColumn = letter[sortBy as keyof typeof letter] ?? letter.createdAt
    query = query.orderBy(
      sortOrder === "desc" ? desc(sortColumn as any) : asc(sortColumn as any)
    )

    return await query.limit(limit).offset(offset)
  },

  async count({
    filters = {},
  }: {
    filters?: {
      issuedBy?: string
      recipientMemberId?: string
      letterType?: string | string[]
      status?: string | string[]
      search?: string
      visibility?: string
    }
  } = {}): Promise<number> {
    let query = db.select({ count: count() }).from(letter) as any

    const conditions = []
    if (filters.issuedBy) conditions.push(eq(letter.issuedBy, filters.issuedBy))
    if (filters.recipientMemberId)
      conditions.push(eq(letter.recipientMemberId, filters.recipientMemberId))

    const typeFilters = normalizeEnum(filters.letterType, letterTypeOptions)
    if (typeFilters) conditions.push(inArray(letter.letterType, typeFilters))

    const statusFilters = normalizeEnum(filters.status, letterStatusOptions)
    if (statusFilters) conditions.push(inArray(letter.status, statusFilters))

    if (filters.visibility)
      conditions.push(eq(letter.visibility, filters.visibility as any))

    if (filters.search) {
      const term = `%${filters.search}%`
      conditions.push(
        or(
          ilike(letter.subject, term),
          ilike(letter.recipient, term),
          ilike(letter.refNumber, term),
          ilike(letter.description, term)
        )
      )
    }

    if (conditions.length > 0) query = query.where(and(...conditions))

    const [{ count: total }] = await query
    return total
  },

  async create(data: NewLetter): Promise<Letter> {
    const result = await db
      .insert(letter)
      .values({ ...data, createdAt: new Date(), updatedAt: new Date() })
      .returning()
    return result[0]
  },

  async updateById(
    id: string,
    updates: Partial<Letter>
  ): Promise<Letter | null> {
    const result = await db
      .update(letter)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(letter.id, id))
      .returning()
    return result[0] || null
  },

  async deleteById(id: string): Promise<boolean> {
    const result = await db.delete(letter).where(eq(letter.id, id))
    return (result.rowCount ?? 0) > 0
  },

  async incrementDownloadCount(id: string): Promise<void> {
    await db
      .update(letter)
      .set({
        downloadCount: sql`${letter.downloadCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(letter.id, id))
  },
}
