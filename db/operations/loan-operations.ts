// db/operations/loan-operations.ts
import { db } from "@/db/connection"
import { loan } from "@/db/schemas/loan-schema"
import type { Loan, LoanStatus, NewLoan } from "@/db/schemas/loan-schema"
import { and, asc, count, desc, eq, gte, inArray, lte } from "drizzle-orm"

const loanStatusOptions: LoanStatus[] = [
  "requested",
  "approved",
  "rejected",
  "disbursed",
  "repaying",
  "repaid",
  "overdue",
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

export const loanOperations = {
  async findById(id: string): Promise<Loan | null> {
    const result = await db.select().from(loan).where(eq(loan.id, id)).limit(1)
    return result[0] || null
  },

  async findMany({
    limit = 50,
    offset = 0,
    sortBy = "requestedAt",
    sortOrder = "desc",
    filters = {},
  }: {
    limit?: number
    offset?: number
    sortBy?: keyof Loan
    sortOrder?: "asc" | "desc"
    filters?: {
      memberId?: string
      status?: string | string[]
      requestedFrom?: Date
      requestedTo?: Date
    }
  } = {}): Promise<Loan[]> {
    let query = db.select().from(loan)

    const conditions = []
    if (filters.memberId) conditions.push(eq(loan.memberId, filters.memberId))
    const statusFilters = normalizeEnumFilter(filters.status, loanStatusOptions)
    if (statusFilters) {
      conditions.push(inArray(loan.status, statusFilters))
    }
    if (filters.requestedFrom)
      conditions.push(gte(loan.requestedAt, filters.requestedFrom))
    if (filters.requestedTo)
      conditions.push(lte(loan.requestedAt, filters.requestedTo))

    if (conditions.length > 0) {
      query = query.where(and(...conditions))
    }

    const sortColumn = loan[sortBy as keyof typeof loan] ?? loan.requestedAt
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
    }
  } = {}): Promise<number> {
    let query = db.select({ count: count() }).from(loan)

    const conditions = []
    if (filters.memberId) conditions.push(eq(loan.memberId, filters.memberId))
    const statusFilters = normalizeEnumFilter(filters.status, loanStatusOptions)
    if (statusFilters) {
      conditions.push(inArray(loan.status, statusFilters))
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions))
    }

    const [{ count: total }] = await query
    return total
  },

  async create(data: NewLoan): Promise<Loan> {
    const result = await db
      .insert(loan)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()
    return result[0]
  },

  async updateById(id: string, updates: Partial<Loan>): Promise<Loan | null> {
    const result = await db
      .update(loan)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(loan.id, id))
      .returning()
    return result[0] || null
  },

  async deleteById(id: string): Promise<boolean> {
    const result = await db.delete(loan).where(eq(loan.id, id))
    return result.rowCount > 0
  },
}
