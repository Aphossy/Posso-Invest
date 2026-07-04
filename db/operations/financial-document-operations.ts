import { db } from "@/db/connection"
import { financialDocument } from "@/db/schemas/financial-document-schema"
import type {
  FinancialDocStatus,
  FinancialDocType,
  FinancialDocument,
  NewFinancialDocument,
} from "@/db/schemas/financial-document-schema"
import { and, asc, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm"

const docTypeOptions: FinancialDocType[] = [
  "monthly_report",
  "balance_sheet",
  "income_statement",
  "contribution_schedule",
  "loan_agreement",
  "disbursement_record",
  "repayment_schedule",
  "audit_report",
  "bank_statement",
  "budget",
  "other",
]

const statusOptions: FinancialDocStatus[] = ["draft", "published", "archived"]

function normalizeEnum<T extends string>(
  value: string | string[] | undefined,
  allowed: readonly T[]
): T[] | undefined {
  if (!value) return undefined
  const values = Array.isArray(value) ? value : [value]
  const filtered = values.filter((v): v is T => allowed.includes(v as T))
  return filtered.length ? filtered : undefined
}

export const financialDocumentOperations = {
  async findById(id: string): Promise<FinancialDocument | null> {
    const result = await db
      .select()
      .from(financialDocument)
      .where(eq(financialDocument.id, id))
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
    sortBy?: keyof FinancialDocument
    sortOrder?: "asc" | "desc"
    filters?: {
      uploadedBy?: string
      docType?: string | string[]
      status?: string | string[]
      period?: string
      fiscalYear?: number
      search?: string
      visibility?: string
    }
  } = {}): Promise<FinancialDocument[]> {
    let query = db.select().from(financialDocument) as any

    const conditions = []
    if (filters.uploadedBy)
      conditions.push(eq(financialDocument.uploadedBy, filters.uploadedBy))
    if (filters.period)
      conditions.push(eq(financialDocument.period, filters.period))
    if (filters.fiscalYear)
      conditions.push(eq(financialDocument.fiscalYear, filters.fiscalYear))
    if (filters.visibility)
      conditions.push(
        eq(financialDocument.visibility, filters.visibility as any)
      )

    const typeFilters = normalizeEnum(filters.docType, docTypeOptions)
    if (typeFilters)
      conditions.push(inArray(financialDocument.docType, typeFilters))

    const statusFilters = normalizeEnum(filters.status, statusOptions)
    if (statusFilters)
      conditions.push(inArray(financialDocument.status, statusFilters))

    if (filters.search) {
      const term = `%${filters.search}%`
      conditions.push(
        or(
          ilike(financialDocument.title, term),
          ilike(financialDocument.description, term),
          ilike(financialDocument.notes, term)
        )
      )
    }

    if (conditions.length > 0) query = query.where(and(...conditions))

    const sortColumn =
      financialDocument[sortBy as keyof typeof financialDocument] ??
      financialDocument.createdAt
    query = query.orderBy(
      sortOrder === "desc" ? desc(sortColumn as any) : asc(sortColumn as any)
    )

    return await query.limit(limit).offset(offset)
  },

  async count({
    filters = {},
  }: {
    filters?: {
      uploadedBy?: string
      docType?: string | string[]
      status?: string | string[]
      period?: string
      fiscalYear?: number
      search?: string
      visibility?: string
    }
  } = {}): Promise<number> {
    let query = db.select({ count: count() }).from(financialDocument) as any

    const conditions = []
    if (filters.uploadedBy)
      conditions.push(eq(financialDocument.uploadedBy, filters.uploadedBy))
    if (filters.period)
      conditions.push(eq(financialDocument.period, filters.period))
    if (filters.fiscalYear)
      conditions.push(eq(financialDocument.fiscalYear, filters.fiscalYear))
    if (filters.visibility)
      conditions.push(
        eq(financialDocument.visibility, filters.visibility as any)
      )

    const typeFilters = normalizeEnum(filters.docType, docTypeOptions)
    if (typeFilters)
      conditions.push(inArray(financialDocument.docType, typeFilters))

    const statusFilters = normalizeEnum(filters.status, statusOptions)
    if (statusFilters)
      conditions.push(inArray(financialDocument.status, statusFilters))

    if (filters.search) {
      const term = `%${filters.search}%`
      conditions.push(
        or(
          ilike(financialDocument.title, term),
          ilike(financialDocument.description, term),
          ilike(financialDocument.notes, term)
        )
      )
    }

    if (conditions.length > 0) query = query.where(and(...conditions))

    const [{ count: total }] = await query
    return total
  },

  async create(data: NewFinancialDocument): Promise<FinancialDocument> {
    const result = await db
      .insert(financialDocument)
      .values({ ...data, createdAt: new Date(), updatedAt: new Date() })
      .returning()
    return result[0]
  },

  async updateById(
    id: string,
    updates: Partial<FinancialDocument>
  ): Promise<FinancialDocument | null> {
    const result = await db
      .update(financialDocument)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(financialDocument.id, id))
      .returning()
    return result[0] || null
  },

  async deleteById(id: string): Promise<boolean> {
    const result = await db
      .delete(financialDocument)
      .where(eq(financialDocument.id, id))
    return (result.rowCount ?? 0) > 0
  },

  async incrementDownloadCount(id: string): Promise<void> {
    await db
      .update(financialDocument)
      .set({
        downloadCount: sql`${financialDocument.downloadCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(financialDocument.id, id))
  },
}
