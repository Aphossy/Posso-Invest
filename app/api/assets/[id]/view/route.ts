// C:\Users\user\OneDrive\Desktop\trustlink-group\app\api\assets\[id]\view\route.ts
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
  successResponse,
} from "@/lib/api-response"
import { auth } from "@/lib/auth"
import { getSignedUrlForDownload } from "@/lib/r2-enhanced"
import { rateLimit } from "@/lib/rate-limiter"

/**
 * POST /api/assets/[id]/view
 * Get view URL (with signed URL for R2 files) and track view
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  const { startTime } = withTiming()

  try {
    const rateLimitResult = await rateLimit("asset-view", 200, 60)
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

    const { id } = params

    // Get asset
    const asset = await assetOperations.findById(id)

    if (!asset) {
      return notFoundResponse(request, "Asset not found", { startTime })
    }

    // Check visibility permissions
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    let userRole: string | undefined
    let userId: string | undefined

    if (session) {
      const user = await userOperations.getProfileByUserId(
        session.user.id as string
      )
      if (user) {
        userRole = user.role as string
        userId = user.id
      }
    }

    // Check access based on visibility
    const canAccess = checkAssetAccess(asset, userRole, userId)

    if (!canAccess) {
      return forbiddenResponse(request, "Access denied to this asset", {
        startTime,
      })
    }

    // Generate signed URL for R2 files
    let viewUrl = asset.fileUrl

    if (asset.storageProvider === "r2" && asset.fileKey) {
      try {
        // Generate signed URL with 1 hour expiry
        viewUrl = await getSignedUrlForDownload(asset.fileKey, 3600)
      } catch (error) {
        logger.error("Failed to generate signed URL:", { error, assetId: id })
        // Fall back to the stored URL if signing fails
      }
    }

    // Increment view count (async, don't wait)
    assetOperations.incrementViewCount(id).catch((err) => {
      logger.error("Failed to increment view count:", err)
    })

    return successResponse(
      request,
      {
        viewUrl,
        thumbnailUrl: asset.thumbnailUrl,
        previewUrl: asset.previewUrl,
        fileName: asset.name,
        fileType: asset.fileType,
        fileSize: asset.fileSize,
        assetType: asset.assetType,
        expiresIn: asset.storageProvider === "r2" ? 3600 : undefined,
      },
      {
        statusCode: 200,
        startTime,
        message: "View URL retrieved successfully",
      }
    )
  } catch (error: any) {
    logger.error("Asset view error:", { error })
    return internalErrorResponse(request, "Failed to get view URL", {
      startTime,
      debug:
        process.env.NODE_ENV === "development"
          ? { error: error.message }
          : undefined,
    })
  }
}

// Helper function to check asset access (TrustLink Group visibility rules).
// Private files are ONLY accessible by the owner - even admin cannot view
// another member's private files.
function checkAssetAccess(
  asset: any,
  userRole?: string,
  userId?: string
): boolean {
  // Public assets - anyone can access
  if (asset.visibility === "public") return true

  // Not authenticated - only public
  if (!userRole) return false

  // Owner always has access to their own files regardless of visibility
  if (asset.uploadedBy === userId) return true

  // Private files - owner only (already handled above)
  if (asset.visibility === "private") return false

  // Check visibility levels for authenticated users
  switch (asset.visibility) {
    case "authenticated":
      return true // Any logged-in member
    case "committee":
      // Committee members and admin can access committee-visible files
      return ["admin", "treasurer", "secretary"].includes(userRole)
    case "admin":
      return userRole === "admin"
    default:
      return false
  }
}
