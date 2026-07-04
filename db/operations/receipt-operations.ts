import { db } from "@/db/connection"
import { receipt } from "@/db/schemas/receipt-schema"
import type {
  NewReceipt,
  Receipt,
  ReceiptStatus,
  ReceiptType,
} from "@/db/schemas/receipt-schema"
import { and, asc, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm"

const receiptTypeOptions: ReceiptType[] = [
  "contribution",
  "loan_repayment",
  "penalty_payment",
  "registration_fee",
  "other",
]

const statusOptions: ReceiptStatus[] = ["issued", "void", "replaced"]

function normalizeEnum<T extends string>(
  value: string | string[] | undefined,
  allowed: readonly T[]
): T[] | undefined {
  if (!value) return undefined
  const values = Array.isArray(value) ? value : [value]
  const filtered = values.filter((v): v is T => allowed.includes(v as T))
  return filtered.length ? filtered : undefined
}

export const receiptOperations = {
  async findById(id: string): Promise<Receipt | null> {
    const result = await db
      .select()
      .from(receipt)
      .where(eq(receipt.id, id))
      .limit(1)
    return result[0] || null
  },

  async findByReceiptNumber(receiptNumber: string): Promise<Receipt | null> {
    const result = await db
      .select()
      .from(receipt)
      .where(eq(receipt.receiptNumber, receiptNumber))
      .limit(1)
    return result[0] || null
  },

  async findMany({
    limit = 25,
    offset = 0,
    sortBy = "issuedAt",
    sortOrder = "desc",
    filters = {},
  }: {
    limit?: number
    offset?: number
    sortBy?: keyof Receipt
    sortOrder?: "asc" | "desc"
    filters?: {
      memberId?: string
      issuedBy?: string
      receiptType?: string | string[]
      status?: string | string[]
      period?: string
      contributionId?: string
      search?: string
    }
  } = {}): Promise<Receipt[]> {
    let query = db.select().from(receipt) as any

    const conditions = []
    if (filters.memberId)
      conditions.push(eq(receipt.memberId, filters.memberId))
    if (filters.issuedBy)
      conditions.push(eq(receipt.issuedBy, filters.issuedBy))
    if (filters.period) conditions.push(eq(receipt.period, filters.period))
    if (filters.contributionId)
      conditions.push(eq(receipt.contributionId, filters.contributionId))

    const typeFilters = normalizeEnum(filters.receiptType, receiptTypeOptions)
    if (typeFilters) conditions.push(inArray(receipt.receiptType, typeFilters))

    const statusFilters = normalizeEnum(filters.status, statusOptions)
    if (statusFilters) conditions.push(inArray(receipt.status, statusFilters))

    if (filters.search) {
      const term = `%${filters.search}%`
      conditions.push(
        or(
          ilike(receipt.receiptNumber, term),
          ilike(receipt.notes, term),
          ilike(receipt.period, term)
        )
      )
    }

    if (conditions.length > 0) query = query.where(and(...conditions))

    const sortColumn =
      receipt[sortBy as keyof typeof receipt] ?? receipt.issuedAt
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
      issuedBy?: string
      receiptType?: string | string[]
      status?: string | string[]
      period?: string
      contributionId?: string
      search?: string
    }
  } = {}): Promise<number> {
    let query = db.select({ count: count() }).from(receipt) as any

    const conditions = []
    if (filters.memberId)
      conditions.push(eq(receipt.memberId, filters.memberId))
    if (filters.issuedBy)
      conditions.push(eq(receipt.issuedBy, filters.issuedBy))
    if (filters.period) conditions.push(eq(receipt.period, filters.period))
    if (filters.contributionId)
      conditions.push(eq(receipt.contributionId, filters.contributionId))

    const typeFilters = normalizeEnum(filters.receiptType, receiptTypeOptions)
    if (typeFilters) conditions.push(inArray(receipt.receiptType, typeFilters))

    const statusFilters = normalizeEnum(filters.status, statusOptions)
    if (statusFilters) conditions.push(inArray(receipt.status, statusFilters))

    if (filters.search) {
      const term = `%${filters.search}%`
      conditions.push(
        or(
          ilike(receipt.receiptNumber, term),
          ilike(receipt.notes, term),
          ilike(receipt.period, term)
        )
      )
    }

    if (conditions.length > 0) query = query.where(and(...conditions))

    const [{ count: total }] = await query
    return total
  },

  async create(data: NewReceipt): Promise<Receipt> {
    const result = await db
      .insert(receipt)
      .values({
        ...data,
        issuedAt: data.issuedAt ?? new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()
    return result[0]
  },

  async updateById(
    id: string,
    updates: Partial<Receipt>
  ): Promise<Receipt | null> {
    const result = await db
      .update(receipt)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(receipt.id, id))
      .returning()
    return result[0] || null
  },

  async deleteById(id: string): Promise<boolean> {
    const result = await db.delete(receipt).where(eq(receipt.id, id))
    return (result.rowCount ?? 0) > 0
  },

  async incrementDownloadCount(id: string): Promise<void> {
    await db
      .update(receipt)
      .set({
        downloadCount: sql`${receipt.downloadCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(receipt.id, id))
  },

  /** Generate the next sequential receipt number for the current year. */
  async generateReceiptNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const prefix = `TLG-R-${year}-`
    const all = await db
      .select({ receiptNumber: receipt.receiptNumber })
      .from(receipt)
      .where(ilike(receipt.receiptNumber, `${prefix}%`))
    const maxSeq = all.reduce((max: number, row: (typeof all)[number]) => {
      const seq = parseInt(row.receiptNumber?.replace(prefix, "") ?? "0", 10)
      return isNaN(seq) ? max : Math.max(max, seq)
    }, 0)
    return `${prefix}${String(maxSeq + 1).padStart(3, "0")}`
  },
}
