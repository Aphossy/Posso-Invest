// app\api\assets\stats\route.ts
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
} from "@/lib/api-response"
import { auth } from "@/lib/auth"
import { rateLimit } from "@/lib/rate-limiter"

/**
 * GET /api/assets/stats
 * Get asset statistics scoped to what the caller is allowed to see.
 * Private files belonging to other members are excluded from all counts.
 */
export async function GET(request: NextRequest) {
  const { startTime } = withTiming()

  try {
    const rateLimitResult = await rateLimit("asset-stats", 60, 60)
    if (!rateLimitResult.success) {
      return errorResponse(
        request,
        {
          code: "RATE_LIMITED",
          message: "Too many requests. Please try again later.",
        },
        { statusCode: 429, startTime }
      )
    }

    // Require authentication
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
      return unauthorizedResponse(request, "Invalid session", { startTime })
    }

    const userRole = user.role as string
    const userId = user.id
    const { searchParams } = new URL(request.url)
    const excludeUploadedBy = searchParams.get("excludeUploadedBy") || undefined

    // Determine visibility filter - mirrors the logic in GET /api/assets
    let visibilityFilter: string[]
    if (userRole === "admin") {
      visibilityFilter = ["public", "authenticated", "committee", "admin"]
    } else if (userRole === "treasurer" || userRole === "secretary") {
      visibilityFilter = ["public", "authenticated", "committee"]
    } else {
      visibilityFilter = ["public", "authenticated"]
    }

    // Get statistics scoped to what this user can see (+ their own private files)
    const stats = await assetOperations.getStats({
      visibilityFilter,
      ownerId: userId,
      excludeUploadedBy,
    })

    return successResponse(request, stats, {
      statusCode: 200,
      startTime,
      message: "Asset statistics retrieved successfully",
      links: {
        assets: `/api/assets`,
      },
      cacheControl: "private, max-age=300",
    })
  } catch (error: any) {
    logger.error("Asset stats error:", { error })
    return internalErrorResponse(request, "Failed to retrieve statistics", {
      startTime,
      debug:
        process.env.NODE_ENV === "development"
          ? { error: error.message }
          : undefined,
    })
  }
}
