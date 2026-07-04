import { db } from "@/db/connection"
import { operationalExpense } from "@/db/schemas/operational-expense-schema"
import type {
  ExpenseCategory,
  ExpenseStatus,
  NewOperationalExpense,
  OperationalExpense,
} from "@/db/schemas/operational-expense-schema"
import { and, asc, count, desc, eq, gte, inArray, lte } from "drizzle-orm"

const expenseCategoryOptions: ExpenseCategory[] = [
  "bank_charge",
  "notary",
  "transport",
  "office_supplies",
  "communication",
  "event",
  "other",
]

const expenseStatusOptions: ExpenseStatus[] = [
  "pending",
  "approved",
  "rejected",
]

function normalizeEnumFilter<T extends string>(
  value: string | string[] | undefined,
  allowed: readonly T[]
): T[] | undefined {
  if (!value) return undefined
  const values = Array.isArray(value) ? value : [value]
  const filtered = values.filter((item): item is T =>
    allowed.includes(item as T)
  )
  return filtered.length ? filtered : undefined
}

export const operationalExpenseOperations = {
  async findById(id: string): Promise<OperationalExpense | null> {
    const result = await db
      .select()
      .from(operationalExpense)
      .where(eq(operationalExpense.id, id))
      .limit(1)
    return result[0] ?? null
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
    sortBy?: keyof OperationalExpense
    sortOrder?: "asc" | "desc"
    filters?: {
      submittedById?: string
      status?: string | string[]
      category?: string | string[]
      createdAtFrom?: Date
      createdAtTo?: Date
    }
  } = {}): Promise<OperationalExpense[]> {
    const conditions = []

    if (filters.submittedById)
      conditions.push(
        eq(operationalExpense.submittedById, filters.submittedById)
      )

    const statusFilters = normalizeEnumFilter(
      filters.status,
      expenseStatusOptions
    )
    if (statusFilters)
      conditions.push(inArray(operationalExpense.status, statusFilters))

    const categoryFilters = normalizeEnumFilter(
      filters.category,
      expenseCategoryOptions
    )
    if (categoryFilters)
      conditions.push(inArray(operationalExpense.category, categoryFilters))

    if (filters.createdAtFrom)
      conditions.push(gte(operationalExpense.createdAt, filters.createdAtFrom))
    if (filters.createdAtTo)
      conditions.push(lte(operationalExpense.createdAt, filters.createdAtTo))

    const sortColumn =
      operationalExpense[sortBy as keyof typeof operationalExpense] ??
      operationalExpense.createdAt

    let query = db.select().from(operationalExpense)
    if (conditions.length > 0) query = query.where(and(...conditions))
    query = query.orderBy(
      sortOrder === "desc" ? desc(sortColumn as any) : asc(sortColumn as any)
    )

    return await query.limit(limit).offset(offset)
  },

  async count({
    filters = {},
  }: {
    filters?: {
      submittedById?: string
      status?: string | string[]
      category?: string | string[]
    }
  } = {}): Promise<number> {
    const conditions = []

    if (filters.submittedById)
      conditions.push(
        eq(operationalExpense.submittedById, filters.submittedById)
      )

    const statusFilters = normalizeEnumFilter(
      filters.status,
      expenseStatusOptions
    )
    if (statusFilters)
      conditions.push(inArray(operationalExpense.status, statusFilters))

    const categoryFilters = normalizeEnumFilter(
      filters.category,
      expenseCategoryOptions
    )
    if (categoryFilters)
      conditions.push(inArray(operationalExpense.category, categoryFilters))

    let query = db.select({ count: count() }).from(operationalExpense)
    if (conditions.length > 0) query = query.where(and(...conditions))

    const [{ count: total }] = await query
    return total
  },

  async create(data: NewOperationalExpense): Promise<OperationalExpense> {
    const result = await db
      .insert(operationalExpense)
      .values({ ...data, createdAt: new Date(), updatedAt: new Date() })
      .returning()
    return result[0]
  },

  async updateById(
    id: string,
    updates: Partial<OperationalExpense>
  ): Promise<OperationalExpense | null> {
    const result = await db
      .update(operationalExpense)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(operationalExpense.id, id))
      .returning()
    return result[0] ?? null
  },

  async deleteById(id: string): Promise<boolean> {
    const result = await db
      .delete(operationalExpense)
      .where(eq(operationalExpense.id, id))
    return (result.rowCount ?? 0) > 0
  },

  async sumApproved(): Promise<number> {
    const rows = await db
      .select({ amount: operationalExpense.amount })
      .from(operationalExpense)
      .where(eq(operationalExpense.status, "approved"))
    return rows.reduce((sum: number, r: { amount: string | null }) => {
      const v = Number.parseFloat(String(r.amount) || "0")
      return sum + (Number.isNaN(v) ? 0 : v)
    }, 0)
  },
}
