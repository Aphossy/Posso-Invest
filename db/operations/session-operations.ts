import { db } from "@/db/connection"
import { session } from "@/db/schemas"
import type { NewSession, Session } from "@/db/schemas"
import { and, desc, eq, gte, like, lte } from "drizzle-orm"

// Enhanced Session operations
export const sessionOperations = {
  async create(sessionData: NewSession): Promise<Session> {
    const result = await db
      .insert(session)
      .values({
        ...sessionData,
        createdAt: new Date(),
      })
      .returning()
    return result[0]
  },

  async findByToken(token: string): Promise<Session | null> {
    const result = await db
      .select()
      .from(session)
      .where(and(eq(session.token, token), eq(session.isActive, true)))
      .limit(1)
    return result[0] || null
  },

  async findByUserId(userId: string): Promise<Session[]> {
    return await db
      .select()
      .from(session)
      .where(and(eq(session.userId, userId), eq(session.isActive, true)))
      .orderBy(desc(session.lastAccessedAt))
  },

  async updateLastAccessed(token: string): Promise<void> {
    await db
      .update(session)
      .set({ lastAccessedAt: new Date() })
      .where(eq(session.token, token))
  },

  async deleteByToken(token: string): Promise<boolean> {
    const result = await db
      .update(session)
      .set({ isActive: false })
      .where(eq(session.token, token))
    return result.rowCount > 0
  },

  async deleteByUserId(userId: string): Promise<boolean> {
    const result = await db
      .update(session)
      .set({ isActive: false })
      .where(eq(session.userId, userId))
    return result.rowCount > 0
  },

  async deleteExpiredSessions(): Promise<number> {
    const result = await db
      .update(session)
      .set({ isActive: false })
      .where(
        and(eq(session.isActive, true), lte(session.expiresAt, new Date()))
      )
    return result.rowCount
  },

  async getActiveSessions({
    filters = {},
    limit = 50,
    offset = 0,
    sortBy = "createdAt",
    sortOrder = "desc",
  }: {
    filters?: {
      userId?: string
      adminView?: boolean
      deviceInfo?: string
      ipAddress?: string
      userAgent?: string
      createdAtFrom?: string
      createdAtTo?: string
      lastAccessedAtFrom?: string
      lastAccessedAtTo?: string
      expiresAtFrom?: string
      expiresAtTo?: string
    }
    limit?: number
    offset?: number
    sortBy?: keyof Session
    sortOrder?: "asc" | "desc"
  } = {}): Promise<Session[]> {
    let query = db.select().from(session)

    // Build where conditions
    const conditions = []

    // Always filter by active sessions and valid expiration
    conditions.push(eq(session.isActive, true))
    conditions.push(gte(session.expiresAt, new Date()))

    // Apply filters
    if (filters.userId) {
      conditions.push(eq(session.userId, filters.userId))
    }

    // Admin view: allow admins to bypass userId filter if adminView is true
    if (!filters.adminView && filters.userId) {
      conditions.push(eq(session.userId, filters.userId))
    }

    if (filters.deviceInfo) {
      conditions.push(like(session.deviceInfo, `%${filters.deviceInfo}%`))
    }

    if (filters.ipAddress) {
      conditions.push(like(session.ipAddress, `%${filters.ipAddress}%`))
    }

    if (filters.userAgent) {
      conditions.push(like(session.userAgent, `%${filters.userAgent}%`))
    }

    if (filters.createdAtFrom) {
      conditions.push(gte(session.createdAt, new Date(filters.createdAtFrom)))
    }

    if (filters.createdAtTo) {
      conditions.push(lte(session.createdAt, new Date(filters.createdAtTo)))
    }

    if (filters.lastAccessedAtFrom) {
      conditions.push(
        gte(session.lastAccessedAt, new Date(filters.lastAccessedAtFrom))
      )
    }

    if (filters.lastAccessedAtTo) {
      conditions.push(
        lte(session.lastAccessedAt, new Date(filters.lastAccessedAtTo))
      )
    }

    if (filters.expiresAtFrom) {
      conditions.push(gte(session.expiresAt, new Date(filters.expiresAtFrom)))
    }

    if (filters.expiresAtTo) {
      conditions.push(lte(session.expiresAt, new Date(filters.expiresAtTo)))
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions))
    }

    // Sorting
    const sortColumn =
      session[sortBy as keyof typeof session] ?? session.createdAt
    query = query.orderBy(
      sortOrder === "desc" ? desc(sortColumn as any) : (sortColumn as any)
    )

    // Pagination
    query = query.limit(limit).offset(offset)

    const results = await query
    return results
  },
}
