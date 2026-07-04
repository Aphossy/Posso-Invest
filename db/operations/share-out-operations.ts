// db/operations/share-out-operations.ts
import { db } from "@/db/connection"
import { shareOut, shareOutAllocation } from "@/db/schemas/share-out-schema"
import type {
  NewShareOut,
  NewShareOutAllocation,
  ShareOut,
  ShareOutAllocation,
} from "@/db/schemas/share-out-schema"
import { desc, eq } from "drizzle-orm"

export const shareOutOperations = {
  async findById(id: string): Promise<ShareOut | null> {
    const rows = await db
      .select()
      .from(shareOut)
      .where(eq(shareOut.id, id))
      .limit(1)
    return rows[0] || null
  },

  async findMany(limit = 50): Promise<ShareOut[]> {
    return db
      .select()
      .from(shareOut)
      .orderBy(desc(shareOut.fiscalYear), desc(shareOut.createdAt))
      .limit(limit)
  },

  async create(data: NewShareOut): Promise<ShareOut> {
    const rows = await db
      .insert(shareOut)
      .values({ ...data, createdAt: new Date(), updatedAt: new Date() })
      .returning()
    return rows[0]
  },

  async updateById(
    id: string,
    updates: Partial<ShareOut>
  ): Promise<ShareOut | null> {
    const rows = await db
      .update(shareOut)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(shareOut.id, id))
      .returning()
    return rows[0] || null
  },

  async deleteById(id: string): Promise<boolean> {
    const result = await db.delete(shareOut).where(eq(shareOut.id, id))
    return (result.rowCount ?? 0) > 0
  },
}

export const shareOutAllocationOperations = {
  async findByShareOutId(shareOutId: string): Promise<ShareOutAllocation[]> {
    return db
      .select()
      .from(shareOutAllocation)
      .where(eq(shareOutAllocation.shareOutId, shareOutId))
      .orderBy(desc(shareOutAllocation.netShare))
  },

  async findByMemberId(memberId: string): Promise<ShareOutAllocation[]> {
    return db
      .select()
      .from(shareOutAllocation)
      .where(eq(shareOutAllocation.memberId, memberId))
      .orderBy(desc(shareOutAllocation.createdAt))
  },

  async bulkCreate(
    rows: NewShareOutAllocation[]
  ): Promise<ShareOutAllocation[]> {
    if (rows.length === 0) return []
    return db
      .insert(shareOutAllocation)
      .values(
        rows.map((r) => ({
          ...r,
          createdAt: new Date(),
          updatedAt: new Date(),
        }))
      )
      .returning()
  },

  async markAllPaid(shareOutId: string, paidAt: Date): Promise<void> {
    await db
      .update(shareOutAllocation)
      .set({ status: "paid", paidAt, updatedAt: new Date() })
      .where(eq(shareOutAllocation.shareOutId, shareOutId))
  },
}
