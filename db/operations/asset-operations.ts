import { db } from "@/db/connection"
import {
  assetCollections,
  assetComments,
  assets,
  assetsToCollections,
} from "@/db/schemas/asset-schema"
import type {
  Asset,
  AssetCollection,
  AssetComment,
  NewAsset,
  NewAssetCollection,
  NewAssetComment,
} from "@/db/schemas/asset-schema"
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm"

// ============================================
// ASSET OPERATIONS
// ============================================

export const assetOperations = {
  // Basic CRUD
  async findById(id: string): Promise<Asset | null> {
    const result = await db
      .select()
      .from(assets)
      .where(and(eq(assets.id, id), eq(assets.status, "active")))
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
    sortBy?: keyof Asset
    sortOrder?: "asc" | "desc"
    filters?: any
  } = {}): Promise<Asset[]> {
    let query = db.select().from(assets)

    // Build where conditions
    const conditions = [eq(assets.status, "active")]

    // Asset type filter
    if (filters.assetType) {
      if (Array.isArray(filters.assetType)) {
        conditions.push(inArray(assets.assetType, filters.assetType))
      } else {
        conditions.push(eq(assets.assetType, filters.assetType))
      }
    }

    // Category filter
    if (filters.category) conditions.push(eq(assets.category, filters.category))

    // Project filter
    if (filters.projectId) {
      if (filters.projectId === "none") {
        conditions.push(isNull(assets.projectId))
      } else {
        conditions.push(eq(assets.projectId, filters.projectId))
      }
    }

    // Visibility filter - with own-private support.
    // When ownerId is provided alongside a visibility list, include the caller's
    // own private files regardless of role (ownership always wins).
    if (filters.visibility) {
      if (
        filters.ownerId &&
        Array.isArray(filters.visibility) &&
        filters.visibility.length > 0
      ) {
        conditions.push(
          or(
            inArray(assets.visibility, filters.visibility as any[]),
            and(
              eq(assets.visibility, "private"),
              eq(assets.uploadedBy, filters.ownerId)
            )
          ) as any
        )
      } else if (Array.isArray(filters.visibility)) {
        conditions.push(inArray(assets.visibility, filters.visibility))
      } else {
        conditions.push(eq(assets.visibility, filters.visibility))
      }
    }

    // Uploaded by filter
    if (filters.uploadedBy)
      conditions.push(eq(assets.uploadedBy, filters.uploadedBy))

    // Exclude assets uploaded by a specific user while keeping rows with null uploader
    if (filters.excludeUploadedBy) {
      conditions.push(
        or(
          isNull(assets.uploadedBy),
          ne(assets.uploadedBy, filters.excludeUploadedBy)
        ) as any
      )
    }

    // Search filter
    // if (filters.search) {
    //   conditions.push(
    //     or(
    //       ilike(assets.name, `%${filters.search}%`),
    //       ilike(assets.description, `%${filters.search}%`),
    //       ilike(assets.searchableContent, `%${filters.search}%`)
    //     )
    //   )
    // }

    // Tags filter
    if (
      filters.tags &&
      Array.isArray(filters.tags) &&
      filters.tags.length > 0
    ) {
      conditions.push(sql`${assets.tags} @> ${JSON.stringify(filters.tags)}`)
    }

    // Featured filter
    if (filters.isFeatured !== undefined) {
      conditions.push(eq(assets.isFeatured, filters.isFeatured))
    }

    // Date range filters
    if (filters.createdFrom) {
      conditions.push(gte(assets.createdAt, new Date(filters.createdFrom)))
    }
    if (filters.createdTo) {
      conditions.push(lte(assets.createdAt, new Date(filters.createdTo)))
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions))
    }

    // Sorting
    const sortColumn = assets[sortBy as keyof typeof assets] ?? assets.createdAt
    query = query.orderBy(
      sortOrder === "desc" ? desc(sortColumn as any) : asc(sortColumn as any)
    )

    // Pagination
    query = query.limit(limit).offset(offset)

    return await query
  },

  async updateById(id: string, updates: Partial<Asset>): Promise<Asset | null> {
    const result = await db
      .update(assets)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(assets.id, id))
      .returning()
    return result[0] || null
  },

  async deleteById(id: string, soft = true): Promise<boolean> {
    if (soft) {
      await db
        .update(assets)
        .set({
          status: "deleted",
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(assets.id, id))
      return true
    } else {
      const result = await db.delete(assets).where(eq(assets.id, id))
      return result.rowCount > 0
    }
  },

  async count({ filters = {} }: { filters?: any } = {}): Promise<number> {
    let query = db.select({ count: count() }).from(assets)

    const conditions = [eq(assets.status, "active")]

    if (filters.assetType) {
      if (Array.isArray(filters.assetType)) {
        conditions.push(inArray(assets.assetType, filters.assetType))
      } else {
        conditions.push(eq(assets.assetType, filters.assetType))
      }
    }

    if (filters.category) conditions.push(eq(assets.category, filters.category))
    if (filters.projectId) {
      if (filters.projectId === "none") {
        conditions.push(isNull(assets.projectId))
      } else {
        conditions.push(eq(assets.projectId, filters.projectId))
      }
    }
    if (filters.visibility) {
      if (
        filters.ownerId &&
        Array.isArray(filters.visibility) &&
        filters.visibility.length > 0
      ) {
        conditions.push(
          or(
            inArray(assets.visibility, filters.visibility as any[]),
            and(
              eq(assets.visibility, "private"),
              eq(assets.uploadedBy, filters.ownerId)
            )
          ) as any
        )
      } else if (Array.isArray(filters.visibility)) {
        conditions.push(inArray(assets.visibility, filters.visibility))
      } else {
        conditions.push(eq(assets.visibility, filters.visibility))
      }
    }
    if (filters.uploadedBy)
      conditions.push(eq(assets.uploadedBy, filters.uploadedBy))
    if (filters.excludeUploadedBy) {
      conditions.push(
        or(
          isNull(assets.uploadedBy),
          ne(assets.uploadedBy, filters.excludeUploadedBy)
        ) as any
      )
    }
    // if (filters.search) {
    //   conditions.push(
    //     or(
    //       ilike(assets.name, `%${filters.search}%`),
    //       ilike(assets.description, `%${filters.search}%`)
    //     )
    //   )
    // }

    if (conditions.length > 0) {
      query = query.where(and(...conditions))
    }

    const [{ count: total }] = await query
    return total
  },

  async create(assetData: NewAsset): Promise<Asset> {
    // Generate searchable content
    const searchableContent = [
      assetData.name,
      assetData.description,
      assetData.category,
      ...(assetData.tags || []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()

    const result = await db
      .insert(assets)
      .values({
        ...assetData,
        searchableContent,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()
    return result[0]
  },

  async incrementDownload(id: string): Promise<void> {
    await db
      .update(assets)
      .set({
        downloadCount: sql`${assets.downloadCount} + 1`,
        lastAccessedAt: new Date(),
      })
      .where(eq(assets.id, id))
  },

  // async updateById(id: string, updates: Partial<Asset>): Promise<Asset | null> {
  //   const result = await db
  //     .update(assets)
  //     .set({
  //       ...updates,
  //       updatedAt: new Date(),
  //     })
  //     .where(eq(assets.id, id))
  //     .returning()
  //   return result[0] || null
  // },

  // async deleteById(id: string, soft = true): Promise<boolean> {
  //   if (soft) {
  //     await db
  //       .update(assets)
  //       .set({
  //         status: "deleted",
  //         deletedAt: new Date(),
  //         updatedAt: new Date(),
  //       })
  //       .where(eq(assets.id, id))
  //     return true
  //   } else {
  //     const result = await db.delete(assets).where(eq(assets.id, id))
  //     return result.rowCount > 0
  //   }
  // },

  // Specialized queries
  async findByProject(projectId: string, limit = 50): Promise<Asset[]> {
    return await db
      .select()
      .from(assets)
      .where(and(eq(assets.projectId, projectId), eq(assets.status, "active")))
      .orderBy(desc(assets.createdAt))
      .limit(limit)
  },

  async findByType(assetType: string, limit = 50): Promise<Asset[]> {
    return await db
      .select()
      .from(assets)
      .where(
        and(eq(assets.assetType, assetType as any), eq(assets.status, "active"))
      )
      .orderBy(desc(assets.createdAt))
      .limit(limit)
  },

  async findByCategory(category: string, limit = 50): Promise<Asset[]> {
    return await db
      .select()
      .from(assets)
      .where(and(eq(assets.category, category), eq(assets.status, "active")))
      .orderBy(desc(assets.createdAt))
      .limit(limit)
  },

  async findFeatured(limit = 10): Promise<Asset[]> {
    return await db
      .select()
      .from(assets)
      .where(and(eq(assets.isFeatured, true), eq(assets.status, "active")))
      .orderBy(desc(assets.createdAt))
      .limit(limit)
  },

  async findByUploader(uploadedBy: string, limit = 50): Promise<Asset[]> {
    return await db
      .select()
      .from(assets)
      .where(
        and(eq(assets.uploadedBy, uploadedBy), eq(assets.status, "active"))
      )
      .orderBy(desc(assets.createdAt))
      .limit(limit)
  },

  // Usage tracking
  async incrementViewCount(id: string): Promise<void> {
    await db
      .update(assets)
      .set({
        viewCount: sql`${assets.viewCount} + 1`,
        lastAccessedAt: new Date(),
      })
      .where(eq(assets.id, id))
  },

  async incrementDownloadCount(id: string): Promise<void> {
    await db
      .update(assets)
      .set({
        downloadCount: sql`${assets.downloadCount} + 1`,
        lastAccessedAt: new Date(),
      })
      .where(eq(assets.id, id))
  },

  // Visibility management
  async updateVisibility(
    id: string,
    visibility: string
  ): Promise<Asset | null> {
    const result = await db
      .update(assets)
      .set({
        visibility: visibility as any,
        updatedAt: new Date(),
      })
      .where(eq(assets.id, id))
      .returning()
    return result[0] || null
  },

  // Archive/Restore
  async archive(id: string): Promise<Asset | null> {
    const result = await db
      .update(assets)
      .set({
        status: "archived",
        archivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(assets.id, id))
      .returning()
    return result[0] || null
  },

  async restore(id: string): Promise<Asset | null> {
    const result = await db
      .update(assets)
      .set({
        status: "active",
        archivedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(assets.id, id))
      .returning()
    return result[0] || null
  },

  // Statistics - optionally scoped to what a specific caller can see.
  // visibilityFilter + ownerId mirror the same logic used in findMany/count:
  //   (visibility IN [...visibilityFilter]) OR (visibility = 'private' AND uploaded_by = ownerId)
  async getStats(opts?: {
    visibilityFilter?: string[]
    ownerId?: string
    excludeUploadedBy?: string
  }): Promise<{
    total: number
    byType: Record<string, number>
    byCategory: Record<string, number>
    byVisibility: Record<string, number>
    totalSize: number
    recentUploads: number
  }> {
    // Build the visibility condition once and reuse it across all sub-queries
    const buildVisibilityCond = () => {
      if (opts?.visibilityFilter?.length && opts?.ownerId) {
        return or(
          inArray(assets.visibility, opts.visibilityFilter as any[]),
          and(
            eq(assets.visibility, "private"),
            eq(assets.uploadedBy, opts.ownerId)
          )
        )
      }
      if (opts?.visibilityFilter?.length) {
        return inArray(assets.visibility, opts.visibilityFilter as any[])
      }
      return undefined
    }

    const visibilityCond = buildVisibilityCond()
    const exclusionCond = opts?.excludeUploadedBy
      ? (or(
          isNull(assets.uploadedBy),
          ne(assets.uploadedBy, opts.excludeUploadedBy)
        ) as any)
      : undefined

    const baseWhere = and(
      eq(assets.status, "active"),
      ...(visibilityCond ? [visibilityCond] : []),
      ...(exclusionCond ? [exclusionCond] : [])
    )

    const [totalResult] = await db
      .select({ count: count() })
      .from(assets)
      .where(baseWhere)

    // By type
    const typeStats = await db
      .select({ type: assets.assetType, count: count() })
      .from(assets)
      .where(baseWhere)
      .groupBy(assets.assetType)

    const byType = typeStats.reduce(
      (acc: Record<string, number>, { type, count }: any) => {
        acc[type] = count
        return acc
      },
      {}
    )

    // By category
    const categoryStats = await db
      .select({ category: assets.category, count: count() })
      .from(assets)
      .where(and(baseWhere as any, sql`${assets.category} IS NOT NULL`))
      .groupBy(assets.category)

    const byCategory = categoryStats.reduce(
      (acc: Record<string, number>, { category, count }: any) => {
        if (category) acc[category] = count
        return acc
      },
      {}
    )

    // By visibility
    const visibilityStats = await db
      .select({ visibility: assets.visibility, count: count() })
      .from(assets)
      .where(baseWhere)
      .groupBy(assets.visibility)

    const byVisibility = visibilityStats.reduce(
      (acc: Record<string, number>, { visibility, count }: any) => {
        acc[visibility] = count
        return acc
      },
      {}
    )

    // Total size
    const [sizeResult] = await db
      .select({ totalSize: sql<number>`COALESCE(SUM(${assets.fileSize}), 0)` })
      .from(assets)
      .where(baseWhere)

    // Recent uploads (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const [recentResult] = await db
      .select({ count: count() })
      .from(assets)
      .where(and(baseWhere as any, gte(assets.createdAt, sevenDaysAgo)))

    return {
      total: totalResult.count,
      byType,
      byCategory,
      byVisibility,
      totalSize: sizeResult.totalSize || 0,
      recentUploads: recentResult.count,
    }
  },

  // Stats filtered by a specific uploader
  async getStatsForUploader(uploadedBy: string): Promise<{
    total: number
    byType: Record<string, number>
    byCategory: Record<string, number>
    byVisibility: Record<string, number>
    totalSize: number
    recentUploads: number
  }> {
    const baseCondition = and(
      eq(assets.status, "active"),
      eq(assets.uploadedBy, uploadedBy)
    )

    const [totalResult] = await db
      .select({ count: count() })
      .from(assets)
      .where(baseCondition)

    const typeStats = await db
      .select({ type: assets.assetType, count: count() })
      .from(assets)
      .where(baseCondition)
      .groupBy(assets.assetType)

    const byType = typeStats.reduce(
      (acc: Record<string, number>, { type, count }: any) => {
        acc[type] = count
        return acc
      },
      {}
    )

    const categoryStats = await db
      .select({ category: assets.category, count: count() })
      .from(assets)
      .where(and(baseCondition, sql`${assets.category} IS NOT NULL`))
      .groupBy(assets.category)

    const byCategory = categoryStats.reduce(
      (acc: Record<string, number>, { category, count }: any) => {
        if (category) acc[category] = count
        return acc
      },
      {}
    )

    const visibilityStats = await db
      .select({ visibility: assets.visibility, count: count() })
      .from(assets)
      .where(baseCondition)
      .groupBy(assets.visibility)

    const byVisibility = visibilityStats.reduce(
      (acc: Record<string, number>, { visibility, count }: any) => {
        acc[visibility] = count
        return acc
      },
      {}
    )

    const [sizeResult] = await db
      .select({ totalSize: sql<number>`COALESCE(SUM(${assets.fileSize}), 0)` })
      .from(assets)
      .where(baseCondition)

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const [recentResult] = await db
      .select({ count: count() })
      .from(assets)
      .where(and(baseCondition, gte(assets.createdAt, sevenDaysAgo)))

    return {
      total: totalResult.count,
      byType,
      byCategory,
      byVisibility,
      totalSize: sizeResult.totalSize || 0,
      recentUploads: recentResult.count,
    }
  },

  // Aggregated stats across uploaders (top uploaders)
  async getTopUploaders(
    limit = 10
  ): Promise<{ uploadedBy: string; count: number; totalSize: number }[]> {
    const rows = await db
      .select({
        uploadedBy: assets.uploadedBy,
        count: count(),
        totalSize: sql<number>`COALESCE(SUM(${assets.fileSize}), 0)`,
      })
      .from(assets)
      .where(eq(assets.status, "active"))
      .groupBy(assets.uploadedBy)
      .orderBy(desc(sql`count`))
      .limit(limit)

    return rows.map((r: any) => ({
      uploadedBy: r.uploadedBy,
      count: r.count,
      totalSize: r.totalSize || 0,
    }))
  },
}

// ============================================
// ASSET COLLECTION OPERATIONS
// ============================================

export const assetCollectionOperations = {
  async findById(id: string): Promise<AssetCollection | null> {
    const result = await db
      .select()
      .from(assetCollections)
      .where(eq(assetCollections.id, id))
      .limit(1)
    return result[0] || null
  },

  async findMany(limit = 50, offset = 0): Promise<AssetCollection[]> {
    return await db
      .select()
      .from(assetCollections)
      .orderBy(desc(assetCollections.createdAt))
      .limit(limit)
      .offset(offset)
  },

  async create(data: NewAssetCollection): Promise<AssetCollection> {
    const result = await db
      .insert(assetCollections)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()
    return result[0]
  },

  async addAsset(
    collectionId: string,
    assetId: string,
    order = 0
  ): Promise<void> {
    await db.insert(assetsToCollections).values({
      collectionId,
      assetId,
      order,
    })
  },

  async removeAsset(collectionId: string, assetId: string): Promise<void> {
    await db
      .delete(assetsToCollections)
      .where(
        and(
          eq(assetsToCollections.collectionId, collectionId),
          eq(assetsToCollections.assetId, assetId)
        )
      )
  },

  async getAssets(collectionId: string): Promise<Asset[]> {
    const result = await db
      .select({ asset: assets })
      .from(assetsToCollections)
      .innerJoin(assets, eq(assetsToCollections.assetId, assets.id))
      .where(eq(assetsToCollections.collectionId, collectionId))
      .orderBy(asc(assetsToCollections.order), desc(assets.createdAt))

    return result.map((r: { asset: any }) => r.asset)
  },
}

// ============================================
// ASSET COMMENT OPERATIONS
// ============================================

export const assetCommentOperations = {
  async findByAsset(assetId: string): Promise<AssetComment[]> {
    return await db
      .select()
      .from(assetComments)
      .where(eq(assetComments.assetId, assetId))
      .orderBy(desc(assetComments.createdAt))
  },

  async create(
    data: Omit<NewAssetComment, "createdAt" | "updatedAt">
  ): Promise<AssetComment> {
    const result = await db
      .insert(assetComments)
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
      .delete(assetComments)
      .where(eq(assetComments.id, id))
    return result.rowCount > 0
  },
}

// ============================================
// EXPORTS
// ============================================

const assetOperationsExport = {
  assets: assetOperations,
  collections: assetCollectionOperations,
  comments: assetCommentOperations,
}

export default assetOperationsExport
