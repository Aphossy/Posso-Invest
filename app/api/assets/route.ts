// app\api\assets\route.ts
import { headers } from "next/headers"
import type { NextRequest } from "next/server"
import { userOperations } from "@/db/operations"
import { assetOperations } from "@/db/operations/asset-operations"
import logger from "@/utils/logger"

import { withTiming } from "@/lib/api-middleware"
import {
  errorResponse,
  forbiddenResponse,
  internalErrorResponse,
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from "@/lib/api-response"
import { auth } from "@/lib/auth"
import { rateLimit } from "@/lib/rate-limiter"

/**
 * GET /api/assets
 * List all assets with filters
 */
export async function GET(request: NextRequest) {
  const { startTime } = withTiming()

  try {
    const rateLimitResult = await rateLimit("assets-list", 100, 60)
    if (!rateLimitResult.success) {
      return errorResponse(
        request,
        {
          code: "RATE_LIMITED",
          message: "Too many requests. Please try again later.",
          help: "You can access assets up to 100 times per minute.",
        },
        { statusCode: 429, startTime }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const search = searchParams.get("search") || undefined
    const assetType = searchParams.get("assetType") || undefined
    const category = searchParams.get("category") || undefined
    const projectId = searchParams.get("projectId") || undefined
    const visibilityParams = searchParams.getAll("visibility")
    const uploadedBy = searchParams.get("uploadedBy") || undefined
    const excludeUploadedBy = searchParams.get("excludeUploadedBy") || undefined
    const isFeatured =
      searchParams.get("isFeatured") === "true" ? true : undefined
    const sortBy = searchParams.get("sortBy") || "createdAt"
    const sortOrder = (searchParams.get("sortOrder") || "desc") as
      | "asc"
      | "desc"

    // Get user role for visibility filtering
    let userRole: string | undefined
    let userId: string | undefined

    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (session) {
      const user = await userOperations.getProfileByUserId(
        session.user.id as string
      )
      if (user) {
        userRole = user.role as string
        userId = user.id
      }
    }

    // Build visibility filter based on TrustLink Group role.
    // Private files are NEVER visible to others - only the owner can see them
    // regardless of role. The ownerId key enables the OR condition in the DB layer:
    //   (visibility IN [...allowed]) OR (visibility = 'private' AND uploaded_by = ownerId)
    let visibilityFilter: string[] = []
    if (!session) {
      // Unauthenticated - only public assets
      visibilityFilter = ["public"]
    } else if (userRole === "admin") {
      // Admin sees public + authenticated + committee + admin-only, but NOT other members' private files
      visibilityFilter = ["public", "authenticated", "committee", "admin"]
    } else if (userRole === "treasurer" || userRole === "secretary") {
      // Committee members see public + authenticated + committee
      visibilityFilter = ["public", "authenticated", "committee"]
    } else {
      // Regular members see public + authenticated
      visibilityFilter = ["public", "authenticated"]
    }

    // Parse visibility from query string, supporting either:
    // - repeated params: ?visibility=public&visibility=authenticated
    // - csv value: ?visibility=public,authenticated
    const allowedVisibilityValues = new Set([
      "public",
      "authenticated",
      "committee",
      "admin",
      "private",
    ])

    const requestedVisibility = visibilityParams
      .flatMap((value) => value.split(","))
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
      .filter((value) => allowedVisibilityValues.has(value))

    // Always enforce role visibility. If caller requested specific visibility,
    // intersect with what their role is allowed to see.
    const effectiveVisibility =
      requestedVisibility.length > 0
        ? requestedVisibility.filter((value) =>
            visibilityFilter.includes(value)
          )
        : visibilityFilter

    // If visibility was explicitly requested but none are allowed/valid for role,
    // return an empty result set instead of triggering DB errors.
    if (visibilityParams.length > 0 && effectiveVisibility.length === 0) {
      return successResponse(
        request,
        {
          assets: [],
        },
        {
          statusCode: 200,
          startTime,
          message: "Assets retrieved successfully",
          pagination: {
            page,
            pageSize: limit,
            totalItems: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
          links: {
            self: `/api/assets?page=${page}&limit=${limit}`,
            first: `/api/assets?page=1&limit=${limit}`,
            last: `/api/assets?page=1&limit=${limit}`,
          },
        }
      )
    }

    const filters: any = {
      search,
      assetType,
      category,
      projectId,
      uploadedBy,
      excludeUploadedBy,
      isFeatured,
      // Pass ownerId so the DB layer can include the caller's own private files
      ...(userId ? { ownerId: userId } : {}),
    }

    // Apply effective role-safe visibility filter.
    // Even when visibility includes private, ownerId is still enforced at the DB layer,
    // so callers only see their own private files.
    if (effectiveVisibility.length > 0) {
      filters.visibility = effectiveVisibility
    }

    if (process.env.NODE_ENV === "development") {
      logger.info("Assets list debug filters", {
        userId,
        userRole,
        page,
        limit,
        sortBy,
        sortOrder,
        requestedVisibility,
        effectiveVisibility,
        uploadedBy,
        excludeUploadedBy,
      })
    }

    const offset = (page - 1) * limit

    const [assets, total] = await Promise.all([
      assetOperations.findMany({
        limit,
        offset,
        sortBy: sortBy as any,
        sortOrder,
        filters,
      }),
      assetOperations.count({ filters }),
    ])

    const uploaderIds = Array.from(
      new Set(
        assets
          .map((asset) => asset.uploadedBy)
          .filter((id): id is string => !!id)
      )
    )

    let uploaderMap = new Map<string, { name: string | null; email: string }>()
    if (uploaderIds.length > 0) {
      const uploaders = await userOperations.findByIds(uploaderIds)
      uploaderMap = new Map(
        uploaders.map((uploader) => [
          uploader.id,
          {
            name: uploader.name || null,
            email: uploader.email,
          },
        ])
      )
    }

    const assetsWithUploader = assets.map((asset) => {
      const uploader = asset.uploadedBy
        ? uploaderMap.get(asset.uploadedBy)
        : undefined

      return {
        ...asset,
        uploaderName: uploader?.name ?? null,
        uploaderEmail: uploader?.email ?? null,
      }
    })

    if (process.env.NODE_ENV === "development") {
      logger.info("Assets list debug result", {
        returnedItems: assets.length,
        total,
        uploaderResolved: uploaderMap.size,
      })
    }

    const totalPages = Math.ceil(total / limit)

    return successResponse(
      request,
      {
        assets: assetsWithUploader,
      },
      {
        statusCode: 200,
        startTime,
        message: "Assets retrieved successfully",
        pagination: {
          page,
          pageSize: limit,
          totalItems: total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
        links: {
          self: `/api/assets?page=${page}&limit=${limit}`,
          first: `/api/assets?page=1&limit=${limit}`,
          last: `/api/assets?page=${totalPages}&limit=${limit}`,
          next:
            page < totalPages
              ? `/api/assets?page=${page + 1}&limit=${limit}`
              : undefined,
          prev:
            page > 1
              ? `/api/assets?page=${page - 1}&limit=${limit}`
              : undefined,
        },
      }
    )
  } catch (error: any) {
    logger.error("Assets list error:", { error })
    return internalErrorResponse(request, "Failed to retrieve assets", {
      startTime,
      debug:
        process.env.NODE_ENV === "development"
          ? { error: error.message }
          : undefined,
    })
  }
}

/**
 * POST /api/assets
 * Create a new asset
 */
export async function POST(request: NextRequest) {
  const { startTime } = withTiming()

  try {
    const rateLimitResult = await rateLimit("assets-create", 30, 60)
    if (!rateLimitResult.success) {
      return errorResponse(
        request,
        {
          code: "RATE_LIMITED",
          message: "Too many requests. Please try again later.",
          help: "You can create up to 30 assets per minute.",
        },
        { statusCode: 429, startTime }
      )
    }

    // Verify authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session) {
      return unauthorizedResponse(request, "Authentication required", {
        startTime,
      })
    }

    const user = await userOperations.getProfileByUserId(
      session.user.id as string
    )

    if (!user) {
      return unauthorizedResponse(request, "Invalid session", {
        startTime,
      })
    }

    const userRole = user.role as string

    // Only committee members and admins can create shared assets
    if (!["admin", "treasurer", "secretary"].includes(userRole)) {
      return forbiddenResponse(request, "Insufficient permissions", {
        startTime,
      })
    }

    const body = await request.json()

    // Validate required fields
    if (!body.name || !body.fileUrl || !body.assetType) {
      return validationErrorResponse(
        request,
        "Missing required fields",
        {
          name: body.name ? undefined : ["Name is required"],
          fileUrl: body.fileUrl ? undefined : ["File URL is required"],
          assetType: body.assetType ? undefined : ["Asset type is required"],
        },
        { startTime }
      )
    }

    // Create asset
    const asset = await assetOperations.create({
      ...body,
      uploadedBy: user.id,
      visibility: body.visibility || "committee",
    })

    logger.info("Asset created", {
      assetId: asset.id,
      userId: user.id,
      assetType: asset.assetType,
    })

    return successResponse(
      request,
      {
        asset,
      },
      {
        statusCode: 201,
        startTime,
        message: "Asset created successfully",
        links: {
          self: `/api/assets/${asset.id}`,
          list: `/api/assets`,
        },
      }
    )
  } catch (error: any) {
    logger.error("Asset creation error:", { error })
    return internalErrorResponse(request, "Failed to create asset", {
      startTime,
      debug:
        process.env.NODE_ENV === "development"
          ? { error: error.message }
          : undefined,
    })
  }
}
