import { headers } from "next/headers"
import type { NextRequest } from "next/server"
import { userOperations } from "@/db/operations"
import { assetOperations } from "@/db/operations/asset-operations"
import logger from "@/utils/logger"

import { withTiming } from "@/lib/api-middleware"
import {
  errorResponse,
  internalErrorResponse,
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from "@/lib/api-response"
import { auth } from "@/lib/auth"
import { rateLimit } from "@/lib/rate-limiter"

/**
 * GET /api/assets/user
 * List user's own assets with filters
 */
export async function GET(request: NextRequest) {
  const { startTime } = withTiming()

  try {
    const rateLimitResult = await rateLimit("user-assets-list", 100, 60)
    if (!rateLimitResult.success) {
      return errorResponse(
        request,
        {
          code: "RATE_LIMITED",
          message: "Too many requests. Please try again later.",
          help: "You can access your assets up to 100 times per minute.",
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

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const search = searchParams.get("search") || undefined
    const assetType = searchParams.get("assetType") || undefined
    const category = searchParams.get("category") || undefined
    const sortBy = searchParams.get("sortBy") || "createdAt"
    const sortOrder = (searchParams.get("sortOrder") || "desc") as
      | "asc"
      | "desc"

    // Build filters - only show user's own assets
    const filters: any = {
      search,
      assetType,
      category,
      uploadedBy: user.id, // Critical: Only fetch user's own assets
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

    const totalPages = Math.ceil(total / limit)

    return successResponse(
      request,
      {
        assets,
      },
      {
        statusCode: 200,
        startTime,
        message: "Your assets retrieved successfully",
        pagination: {
          page,
          pageSize: limit,
          totalItems: total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
        links: {
          self: `/api/assets/user?page=${page}&limit=${limit}`,
          first: `/api/assets/user?page=1&limit=${limit}`,
          last: `/api/assets/user?page=${totalPages}&limit=${limit}`,
          next:
            page < totalPages
              ? `/api/assets/user?page=${page + 1}&limit=${limit}`
              : undefined,
          prev:
            page > 1
              ? `/api/assets/user?page=${page - 1}&limit=${limit}`
              : undefined,
        },
      }
    )
  } catch (error: any) {
    logger.error("User assets list error:", { error })
    return internalErrorResponse(request, "Failed to retrieve your assets", {
      startTime,
      debug:
        process.env.NODE_ENV === "development"
          ? { error: error.message }
          : undefined,
    })
  }
}

/**
 * POST /api/assets/user
 * Create a new asset (user upload)
 */
export async function POST(request: NextRequest) {
  const { startTime } = withTiming()

  try {
    const rateLimitResult = await rateLimit("user-assets-create", 20, 60)
    if (!rateLimitResult.success) {
      return errorResponse(
        request,
        {
          code: "RATE_LIMITED",
          message: "Too many requests. Please try again later.",
          help: "You can upload up to 20 files per minute.",
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

    // Resolve requested visibility with role-safe constraints.
    // We keep private as the fallback for invalid/unauthorized values.
    const requestedVisibility = body.visibility as string | undefined
    const validVisibility = new Set([
      "private",
      "authenticated",
      "public",
      "committee",
      "admin",
    ])

    const role = (user.role as string) || "member"
    const roleAllowedVisibility =
      role === "admin"
        ? ["private", "authenticated", "public", "committee", "admin"]
        : role === "treasurer" || role === "secretary"
          ? ["private", "authenticated", "public", "committee"]
          : ["private", "authenticated", "public", "committee"]

    const resolvedVisibility =
      requestedVisibility &&
      validVisibility.has(requestedVisibility) &&
      roleAllowedVisibility.includes(requestedVisibility)
        ? requestedVisibility
        : "private"

    // Create asset - always enforce authenticated uploader id.
    const asset = await assetOperations.create({
      ...body,
      uploadedBy: user.id, // Critical: Always use authenticated user's ID
      visibility: resolvedVisibility,
    })

    logger.info("User asset created", {
      assetId: asset.id,
      userId: user.id,
      role,
      assetType: asset.assetType,
      requestedVisibility,
      resolvedVisibility,
    })

    return successResponse(
      request,
      {
        asset,
      },
      {
        statusCode: 201,
        startTime,
        message: "File uploaded successfully",
        links: {
          self: `/api/assets/user/${asset.id}`,
          list: `/api/assets/user`,
        },
      }
    )
  } catch (error: any) {
    logger.error("User asset creation error:", { error })
    return internalErrorResponse(request, "Failed to upload file", {
      startTime,
      debug:
        process.env.NODE_ENV === "development"
          ? { error: error.message }
          : undefined,
    })
  }
}
