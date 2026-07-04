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
  unauthorizedResponse,
  validationErrorResponse,
} from "@/lib/api-response"
import { auth } from "@/lib/auth"
import { rateLimit } from "@/lib/rate-limiter"

/**
 * GET /api/assets/user/[id]
 * Get a single asset (only if owned by user)
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { startTime } = withTiming()
  const params = await props.params

  try {
    const rateLimitResult = await rateLimit("user-asset-get", 100, 60)
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
      return forbiddenResponse(request, "You can only access your own assets", {
        startTime,
      })
    }

    return successResponse(
      request,
      {
        asset,
      },
      {
        statusCode: 200,
        startTime,
        message: "Asset retrieved successfully",
      }
    )
  } catch (error: any) {
    logger.error("User asset get error:", { error })
    return internalErrorResponse(request, "Failed to retrieve asset", {
      startTime,
      debug:
        process.env.NODE_ENV === "development"
          ? { error: error.message }
          : undefined,
    })
  }
}

/**
 * PATCH /api/assets/user/[id]
 * Update a user's asset (only if owned by user)
 */
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { startTime } = withTiming()
  const params = await props.params

  try {
    const rateLimitResult = await rateLimit("user-asset-update", 30, 60)
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
      return forbiddenResponse(request, "You can only update your own assets", {
        startTime,
      })
    }

    const body = await request.json()

    // Users can update metadata and visibility on their own assets
    const allowedFields = [
      "name",
      "description",
      "category",
      "tags",
      "visibility",
      "alt",
      "caption",
    ]

    const updateData: any = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (updateData.visibility !== undefined) {
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

      if (
        !validVisibility.has(updateData.visibility) ||
        !roleAllowedVisibility.includes(updateData.visibility)
      ) {
        return validationErrorResponse(
          request,
          "Invalid visibility value for your role",
          {
            visibility: [`Allowed values: ${roleAllowedVisibility.join(", ")}`],
          },
          { startTime }
        )
      }
    }

    if (Object.keys(updateData).length === 0) {
      return validationErrorResponse(
        request,
        "No valid fields to update",
        {},
        { startTime }
      )
    }

    const updatedAsset = await assetOperations.updateById(params.id, updateData)

    logger.info("User asset updated", {
      assetId: params.id,
      userId: user.id,
    })

    return successResponse(
      request,
      {
        asset: updatedAsset,
      },
      {
        statusCode: 200,
        startTime,
        message: "Asset updated successfully",
      }
    )
  } catch (error: any) {
    logger.error("User asset update error:", { error })
    return internalErrorResponse(request, "Failed to update asset", {
      startTime,
      debug:
        process.env.NODE_ENV === "development"
          ? { error: error.message }
          : undefined,
    })
  }
}

/**
 * DELETE /api/assets/user/[id]
 * Delete a user's asset (only if owned by user)
 */
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { startTime } = withTiming()
  const params = await props.params

  try {
    const rateLimitResult = await rateLimit("user-asset-delete", 20, 60)
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
      return forbiddenResponse(request, "You can only delete your own assets", {
        startTime,
      })
    }

    await assetOperations.deleteById(params.id)

    logger.info("User asset deleted", {
      assetId: params.id,
      userId: user.id,
    })

    return successResponse(
      request,
      {
        success: true,
      },
      {
        statusCode: 200,
        startTime,
        message: "Asset deleted successfully",
      }
    )
  } catch (error: any) {
    logger.error("User asset delete error:", { error })
    return internalErrorResponse(request, "Failed to delete asset", {
      startTime,
      debug:
        process.env.NODE_ENV === "development"
          ? { error: error.message }
          : undefined,
    })
  }
}
