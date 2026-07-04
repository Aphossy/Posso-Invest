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
  notFoundResponse,
  unauthorizedResponse,
} from "@/lib/api-response"
import { auth } from "@/lib/auth"
import { rateLimit } from "@/lib/rate-limiter"

/**
 * GET /api/assets/user/[id]/download
 * Download a user's asset (only if owned by user)
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { startTime } = withTiming()
  const params = await props.params

  try {
    const rateLimitResult = await rateLimit("user-asset-download", 50, 60)
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

    const asset = await assetOperations.findById(params.id)

    if (!asset) {
      return notFoundResponse(request, "Asset not found", { startTime })
    }

    // Verify ownership
    if (asset.uploadedBy !== user.id) {
      return forbiddenResponse(
        request,
        "You can only download your own assets",
        { startTime }
      )
    }

    // Increment download count
    try {
      await assetOperations.incrementDownload(params.id)
    } catch (error) {
      // Non-critical error, log but continue
      logger.warn("Failed to increment download count", { assetId: params.id })
    }

    // Redirect to the file URL or return the file directly
    if (asset.fileUrl) {
      // For cloud storage URLs, redirect to the file
      return Response.redirect(asset.fileUrl, 302)
    }

    return notFoundResponse(request, "Asset file not available", {
      startTime,
    })
  } catch (error: any) {
    logger.error("User asset download error:", { error })
    return internalErrorResponse(request, "Failed to download asset", {
      startTime,
      debug:
        process.env.NODE_ENV === "development"
          ? { error: error.message }
          : undefined,
    })
  }
}
