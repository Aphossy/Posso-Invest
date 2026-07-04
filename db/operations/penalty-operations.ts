// db/operations/penalty-operations.ts
import { db } from "@/db/connection"
import { penalty } from "@/db/schemas/penalty-schema"
import type {
  NewPenalty,
  Penalty,
  PenaltyStatus,
} from "@/db/schemas/penalty-schema"
import { and, asc, count, desc, eq, inArray } from "drizzle-orm"

const penaltyStatusOptions: PenaltyStatus[] = ["active", "waived"]

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

export const penaltyOperations = {
  async findById(id: string): Promise<Penalty | null> {
    const result = await db
      .select()
      .from(penalty)
      .where(eq(penalty.id, id))
      .limit(1)
    return result[0] || null
  },

  async findByContributionId(contributionId: string): Promise<Penalty | null> {
    const result = await db
      .select()
      .from(penalty)
      .where(eq(penalty.contributionId, contributionId))
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
    sortBy?: keyof Penalty
    sortOrder?: "asc" | "desc"
    filters?: {
      memberId?: string
      status?: string | string[]
      period?: string
      contributionId?: string
    }
  } = {}): Promise<Penalty[]> {
    let query = db.select().from(penalty)

    const conditions = []
    if (filters.memberId)
      conditions.push(eq(penalty.memberId, filters.memberId))
    if (filters.contributionId)
      conditions.push(eq(penalty.contributionId, filters.contributionId))
    const statusFilters = normalizeEnumFilter(
      filters.status,
      penaltyStatusOptions
    )
    if (statusFilters) conditions.push(inArray(penalty.status, statusFilters))
    if (filters.period) conditions.push(eq(penalty.period, filters.period))

    if (conditions.length > 0) query = query.where(and(...conditions))

    const sortColumn =
      penalty[sortBy as keyof typeof penalty] ?? penalty.createdAt
    query = query.orderBy(
      sortOrder === "desc" ? desc(sortColumn as any) : asc(sortColumn as any)
    )

    return await query.limit(limit).offset(offset)
  },

  async count({
    filters = {},
  }: {
    filters?: {
      memberId?: string
      status?: string | string[]
      period?: string
      contributionId?: string
    }
  } = {}): Promise<number> {
    let query = db.select({ count: count() }).from(penalty)

    const conditions = []
    if (filters.memberId)
      conditions.push(eq(penalty.memberId, filters.memberId))
    if (filters.contributionId)
      conditions.push(eq(penalty.contributionId, filters.contributionId))
    const statusFilters = normalizeEnumFilter(
      filters.status,
      penaltyStatusOptions
    )
    if (statusFilters) conditions.push(inArray(penalty.status, statusFilters))
    if (filters.period) conditions.push(eq(penalty.period, filters.period))

    if (conditions.length > 0) query = query.where(and(...conditions))

    const [{ count: total }] = await query
    return total
  },

  async create(data: NewPenalty): Promise<Penalty> {
    const result = await db
      .insert(penalty)
      .values({ ...data, createdAt: new Date(), updatedAt: new Date() })
      .returning()
    return result[0]
  },

  async updateById(
    id: string,
    updates: Partial<Penalty>
  ): Promise<Penalty | null> {
    const result = await db
      .update(penalty)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(penalty.id, id))
      .returning()
    return result[0] || null
  },

  async deleteById(id: string): Promise<boolean> {
    const result = await db.delete(penalty).where(eq(penalty.id, id))
    return (result.rowCount ?? 0) > 0
  },
}
