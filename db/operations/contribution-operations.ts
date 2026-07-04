// db/operations/contribution-operations.ts
import { db } from "@/db/connection"
import { contribution } from "@/db/schemas/contribution-schema"
import type {
  Contribution,
  ContributionStatus,
  NewContribution,
} from "@/db/schemas/contribution-schema"
import { and, asc, count, desc, eq, gte, inArray, lte, sql } from "drizzle-orm"

const contributionStatusOptions: ContributionStatus[] = [
  "pending",
  "confirmed",
  "late",
  "waived",
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

export const contributionOperations = {
  async findById(id: string): Promise<Contribution | null> {
    const result = await db
      .select()
      .from(contribution)
      .where(eq(contribution.id, id))
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
    sortBy?: keyof Contribution
    sortOrder?: "asc" | "desc"
    filters?: {
      memberId?: string
      status?: string | string[]
      period?: string
      recordedBy?: string
      createdAtFrom?: Date
      createdAtTo?: Date
    }
  } = {}): Promise<Contribution[]> {
    let query = db.select().from(contribution)

    const conditions = []
    if (filters.memberId)
      conditions.push(eq(contribution.memberId, filters.memberId))
    const statusFilters = normalizeEnumFilter(
      filters.status,
      contributionStatusOptions
    )
    if (statusFilters) {
      conditions.push(inArray(contribution.status, statusFilters))
    }
    if (filters.period) conditions.push(eq(contribution.period, filters.period))
    if (filters.recordedBy)
      conditions.push(eq(contribution.recordedBy, filters.recordedBy))
    if (filters.createdAtFrom)
      conditions.push(gte(contribution.createdAt, filters.createdAtFrom))
    if (filters.createdAtTo)
      conditions.push(lte(contribution.createdAt, filters.createdAtTo))

    if (conditions.length > 0) {
      query = query.where(and(...conditions))
    }

    const sortColumn =
      contribution[sortBy as keyof typeof contribution] ??
      contribution.createdAt
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
      recordedBy?: string
    }
  } = {}): Promise<number> {
    let query = db.select({ count: count() }).from(contribution)

    const conditions = []
    if (filters.memberId)
      conditions.push(eq(contribution.memberId, filters.memberId))
    const statusFilters = normalizeEnumFilter(
      filters.status,
      contributionStatusOptions
    )
    if (statusFilters) {
      conditions.push(inArray(contribution.status, statusFilters))
    }
    if (filters.period) conditions.push(eq(contribution.period, filters.period))
    if (filters.recordedBy)
      conditions.push(eq(contribution.recordedBy, filters.recordedBy))

    if (conditions.length > 0) {
      query = query.where(and(...conditions))
    }

    const [{ count: total }] = await query
    return total
  },

  /**
   * Total contributions a member has actually paid in (confirmed or paid-late).
   * Used as the member's "savings" base for loan eligibility.
   */
  async sumPaidByMemberId(memberId: string): Promise<number> {
    const [row] = await db
      .select({
        total: sql<string>`coalesce(sum(${contribution.amount}), 0)`,
      })
      .from(contribution)
      .where(
        and(
          eq(contribution.memberId, memberId),
          inArray(contribution.status, ["confirmed", "late"])
        )
      )
    return Number.parseFloat(row?.total ?? "0") || 0
  },

  async create(data: NewContribution): Promise<Contribution> {
    const result = await db
      .insert(contribution)
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
    updates: Partial<Contribution>
  ): Promise<Contribution | null> {
    const result = await db
      .update(contribution)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(contribution.id, id))
      .returning()
    return result[0] || null
  },

  async deleteById(id: string): Promise<boolean> {
    const result = await db.delete(contribution).where(eq(contribution.id, id))
    return result.rowCount > 0
  },
}
