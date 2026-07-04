// db/operations/loan-repayment-operations.ts
import { db } from "@/db/connection"
import { loanRepayment } from "@/db/schemas/loan-repayment-schema"
import type {
  LoanRepayment,
  NewLoanRepayment,
} from "@/db/schemas/loan-repayment-schema"
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm"

export const loanRepaymentOperations = {
  async findById(id: string): Promise<LoanRepayment | null> {
    const result = await db
      .select()
      .from(loanRepayment)
      .where(eq(loanRepayment.id, id))
      .limit(1)
    return result[0] || null
  },

  async findByLoanId(loanId: string): Promise<LoanRepayment[]> {
    return await db
      .select()
      .from(loanRepayment)
      .where(eq(loanRepayment.loanId, loanId))
      .orderBy(asc(loanRepayment.paidAt))
  },

  async findMany({
    limit = 200,
    offset = 0,
    filters = {},
  }: {
    limit?: number
    offset?: number
    filters?: {
      loanId?: string
      memberId?: string
    }
  } = {}): Promise<LoanRepayment[]> {
    let query = db.select().from(loanRepayment)

    const conditions = []
    if (filters.loanId)
      conditions.push(eq(loanRepayment.loanId, filters.loanId))
    if (filters.memberId)
      conditions.push(eq(loanRepayment.memberId, filters.memberId))

    if (conditions.length > 0) {
      query = query.where(and(...conditions))
    }

    return await query
      .orderBy(desc(loanRepayment.paidAt))
      .limit(limit)
      .offset(offset)
  },

  async sumByLoanId(loanId: string): Promise<number> {
    const [row] = await db
      .select({
        total: sql<string>`coalesce(sum(${loanRepayment.amount}), 0)`,
      })
      .from(loanRepayment)
      .where(eq(loanRepayment.loanId, loanId))
    return Number.parseFloat(row?.total ?? "0") || 0
  },

  async sumByLoanIds(loanIds: string[]): Promise<Map<string, number>> {
    const totals = new Map<string, number>()
    if (loanIds.length === 0) return totals

    const rows = await db
      .select({
        loanId: loanRepayment.loanId,
        total: sql<string>`coalesce(sum(${loanRepayment.amount}), 0)`,
      })
      .from(loanRepayment)
      .where(inArray(loanRepayment.loanId, loanIds))
      .groupBy(loanRepayment.loanId)

    for (const row of rows) {
      totals.set(row.loanId, Number.parseFloat(row.total) || 0)
    }
    return totals
  },

  async create(data: NewLoanRepayment): Promise<LoanRepayment> {
    const result = await db
      .insert(loanRepayment)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()
    return result[0]
  },

  async deleteById(id: string): Promise<boolean> {
    const result = await db
      .delete(loanRepayment)
      .where(eq(loanRepayment.id, id))
    return result.rowCount > 0
  },
}
