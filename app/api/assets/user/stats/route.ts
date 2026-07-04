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
 * GET /api/assets/user/stats
 * Get statistics for user's own assets
 */
export async function GET(request: NextRequest) {
  const { startTime } = withTiming()

  try {
    const rateLimitResult = await rateLimit("user-assets-stats", 60, 60)
    if (!rateLimitResult.success) {
      return errorResponse(
        request,
        {
          code: "RATE_LIMITED",
          message: "Too many requests. Please try again later.",
          help: "You can check your stats up to 60 times per minute.",
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

    const userId = user.id as string
    // Get stats for user's assets only
    const stats = await assetOperations.getStatsForUploader(userId)

    return successResponse(request, stats, {
      statusCode: 200,
      startTime,
      message: "Your asset statistics retrieved successfully",
    })
  } catch (error: any) {
    logger.error("User asset stats error:", { error })
    return internalErrorResponse(
      request,
      "Failed to retrieve your asset statistics",
      {
        startTime,
        debug:
          process.env.NODE_ENV === "development"
            ? { error: error.message }
            : undefined,
      }
    )
  }
}
