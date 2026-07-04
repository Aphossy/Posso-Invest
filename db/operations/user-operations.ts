/// db\operations\user-operations.ts
import { db } from "@/db/connection"
import { user, verification } from "@/db/schemas"
import type { NewUser, NewVerification, User, Verification } from "@/db/schemas"
import { and, count, desc, eq, gte, inArray, like, lte, or } from "drizzle-orm"

// Enhanced User operations (including profile operations merged into user table)
export const userOperations = {
  async findByEmail(email: string): Promise<User | null> {
    const result = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(1)
    return result[0] || null
  },

  async findById(id: string): Promise<User | null> {
    const result = await db.select().from(user).where(eq(user.id, id)).limit(1)

    return result[0] || null
  },

  async findByIds(ids: string[]): Promise<User[]> {
    if (!ids.length) return []
    return await db.select().from(user).where(inArray(user.id, ids))
  },

  async findByRole(role: string): Promise<User[]> {
    return await db.select().from(user).where(eq(user.role, role))
  },

  async findUserRole(userId: string): Promise<string[]> {
    const result = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, userId))
    return result.map((r: { role: any }) => r.role)
  },

  async findMany({
    limit = 50,
    offset = 0,
    sortBy = "createdAt",
    sortOrder = "asc",
    filters = {},
  }: {
    limit?: number
    offset?: number
    sortBy?: keyof User
    sortOrder?: "asc" | "desc"
    filters?: any
  } = {}): Promise<User[]> {
    let query = db.select().from(user)

    // Build where conditions
    const conditions = []
    if (filters.banned !== undefined)
      conditions.push(eq(user.banned, filters.banned))
    if (filters.role) conditions.push(eq(user.role, filters.role))
    if (filters.email) conditions.push(like(user.email, `%${filters.email}%`))
    if (filters.name) conditions.push(like(user.name, `%${filters.name}%`))
    if (filters.createdAt)
      conditions.push(gte(user.createdAt, filters.createdAt))
    if (filters.updatedAt)
      conditions.push(lte(user.updatedAt, filters.updatedAt))
    if (filters.emailVerified !== undefined)
      conditions.push(eq(user.emailVerified, filters.emailVerified))
    if (filters.banReason)
      conditions.push(like(user.banReason, `%${filters.banReason}%`))
    if (filters.lastLoginAt)
      conditions.push(gte(user.lastLoginAt, filters.lastLoginAt))
    if (filters.emailVerifiedAt)
      conditions.push(gte(user.emailVerifiedAt, filters.emailVerifiedAt))

    if (conditions.length > 0) {
      query = query.where(and(...conditions))
    }

    // Sorting
    const sortColumn = user[sortBy as keyof typeof user] ?? user.createdAt
    query = query.orderBy(
      sortOrder === "desc" ? desc(sortColumn as any) : (sortColumn as any)
    )

    // Pagination
    query = query.limit(limit).offset(offset)

    const results = await query
    return results
  },

  async create(userData: NewUser): Promise<User> {
    const result = await db
      .insert(user)
      .values({
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()
    return result[0]
  },

  async updateById(id: string, updates: Partial<User>): Promise<User | null> {
    const result = await db
      .update(user)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(user.id, id))
      .returning()
    return result[0] || null
  },

  async updateRole(id: string, role: string): Promise<User | null> {
    const result = await db
      .update(user)
      .set({
        role,
        updatedAt: new Date(),
      })
      .where(eq(user.id, id))
      .returning()
    return result[0] || null
  },

  async updateLastLogin(id: string): Promise<void> {
    await db
      .update(user)
      .set({
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(user.id, id))
  },

  async verifyEmail(email: string): Promise<User | null> {
    const result = await db
      .update(user)
      .set({
        emailVerified: true,
        emailVerifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(user.email, email))
      .returning()
    return result[0] || null
  },

  async suspendUser(id: string, reason: string): Promise<User | null> {
    const result = await db
      .update(user)
      .set({
        isSuspended: true,
        suspensionReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(user.id, id))
      .returning()
    return result[0] || null
  },

  async unsuspendUser(id: string): Promise<User | null> {
    const result = await db
      .update(user)
      .set({
        isSuspended: false,
        suspensionReason: null,
        updatedAt: new Date(),
      })
      .where(eq(user.id, id))
      .returning()
    return result[0] || null
  },

  async deleteById(id: string): Promise<boolean> {
    const result = await db.delete(user).where(eq(user.id, id))
    return result.rowCount > 0
  },

  async findBannedUsers(limit = 50, offset = 0): Promise<User[]> {
    return await db
      .select()
      .from(user)
      .where(and(eq(user.banned, true)))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(user.createdAt))
  },

  async searchUsers(query: string, limit = 20): Promise<User[]> {
    return await db
      .select()
      .from(user)
      .where(or(like(user.name, `%${query}%`), like(user.email, `%${query}%`)))
      .limit(limit)
  },

  async getUserStats(): Promise<{
    total: number
    verified: number
    active: number
    banned: number
    byRole: Record<string, number>
  }> {
    const [totalResult] = await db.select({ count: count() }).from(user)
    const [verifiedResult] = await db
      .select({ count: count() })
      .from(user)
      .where(eq(user.emailVerified, true))
    const [activeResult] = await db
      .select({ count: count() })
      .from(user)
      .where(eq(user.banned, false))
    const [bannedResult] = await db
      .select({ count: count() })
      .from(user)
      .where(eq(user.banned, true))

    // Get role distribution
    const roleStats = await db
      .select({ role: user.role, count: count() })
      .from(user)
      .groupBy(user.role)

    const byRole = roleStats.reduce(
      (
        acc: Record<string, number>,
        { role, count }: { role: string; count: number }
      ) => {
        acc[role] = count
        return acc
      },
      {} as Record<string, number>
    )

    return {
      total: totalResult.count,
      verified: verifiedResult.count,
      active: activeResult.count,
      banned: bannedResult.count,
      byRole,
    }
  },

  // Enhanced profile operations (using merged user schema)
  async getProfileByUserId(userId: string): Promise<User | null> {
    // Returns full user record, which now includes all profile fields
    return await this.findById(userId)
  },

  async updateProfileByUserId(
    userId: string,
    updates: Partial<
      Pick<
        User,
        "name" | "phone" | "dateOfBirth" | "bio" | "address" | "preferences"
      >
    >
  ): Promise<User | null> {
    return await this.updateById(userId, updates)
  },

  async updatePreferences(
    userId: string,
    preferenceUpdates: Partial<User["preferences"]>
  ): Promise<User | null> {
    const currentUser = await this.findById(userId)
    if (!currentUser) return null

    const currentPreferences = currentUser.preferences || {}
    const updatedPreferences = {
      ...currentPreferences,
      ...preferenceUpdates,
      // Optionally track preferences-specific timestamp if needed
      // lastUpdated: new Date().toISOString(),
    }

    return await this.updateById(userId, { preferences: updatedPreferences })
  },

  async createOrUpdateProfile(
    userId: string,
    profileData: Partial<
      Pick<
        User,
        "name" | "phone" | "dateOfBirth" | "bio" | "address" | "preferences"
      >
    >
  ): Promise<User | null> {
    // Ensures user exists, then updates profile fields (acts as create if fields are null/default)
    const existingUser = await this.findById(userId)
    if (!existingUser) return null

    return await this.updateProfileByUserId(userId, profileData)
  },

  async clearProfile(userId: string): Promise<User | null> {
    // Resets profile fields to defaults/nulls
    const defaultUpdates: Partial<User> = {
      name: " ",
      phone: null,
      dateOfBirth: null,
      bio: null,
      address: null,
      preferences: {},
    }
    return await this.updateById(userId, defaultUpdates)
  },
}

// Enhanced Two-factor token operations
// export const twoFactorTokenOperations = {
//   async create(tokenData: NewTwoFactorToken): Promise<TwoFactorToken> {
//     const result = await db
//       .insert(twoFactorToken)
//       .values({
//         ...tokenData,
//         createdAt: new Date(),
//       })
//       .returning()
//     return result[0]
//   },

//   async findByEmailAndToken(
//     email: string,
//     token: string
//   ): Promise<TwoFactorToken | null> {
//     const result = await db
//       .select()
//       .from(twoFactorTokens)
//       .where(
//         and(
//           eq(twoFactorTokens.email, email),
//           eq(twoFactorTokens.token, token),
//           eq(twoFactorTokens.isUsed, false),
//           gte(twoFactorTokens.expires, new Date())
//         )
//       )
//       .limit(1)
//     return result[0] || null
//   },

//   async incrementAttempts(id: string): Promise<void> {
//     await db
//       .update(twoFactorTokens)
//       .set({ attempts: sql`attempts + 1` })
//       .where(eq(twoFactorTokens.id, id))
//   },

//   async markAsUsed(id: string): Promise<void> {
//     await db
//       .update(twoFactorTokens)
//       .set({ isUsed: true })
//       .where(eq(twoFactorTokens.id, id))
//   },

//   async deleteByEmail(email: string): Promise<boolean> {
//     const result = await db
//       .delete(twoFactorTokens)
//       .where(eq(twoFactorTokens.email, email))
//     return result.rowCount > 0
//   },

//   async deleteExpiredTokens(): Promise<number> {
//     const result = await db
//       .delete(twoFactorTokens)
//       .where(lte(twoFactorTokens.expires, new Date()))
//     return result.rowCount
//   },
// }

// // Enhanced Verification token operations
export const verificationTokenOperations = {
  async create(tokenData: NewVerification): Promise<Verification> {
    const result = await db
      .insert(verification)
      .values({
        ...tokenData,
        createdAt: new Date(),
      })
      .returning()
    return result[0]
  },

  async findByToken(token: string): Promise<Verification | null> {
    const result = await db
      .select()
      .from(verification)
      .where(
        and(
          eq(verification.value, token),
          // eq(verification.isUsed, false),
          gte(verification.expiresAt, new Date())
        )
      )
      .limit(1)
    return result[0] || null
  },

  async markAsUsed(token: string): Promise<Verification | null> {
    const result = await db
      .update(verification)
      .set({
        isUsed: true,
        usedAt: new Date(),
      })
      .where(eq(verification.value, token))
      .returning()
    return result[0] || null
  },

  async deleteByToken(token: string): Promise<boolean> {
    const result = await db
      .delete(verification)
      .where(eq(verification.value, token))
    return result.rowCount > 0
  },

  async deleteExpiredTokens(): Promise<number> {
    const result = await db
      .delete(verification)
      .where(lte(verification.expiresAt, new Date()))
    return result.rowCount
  },
}
