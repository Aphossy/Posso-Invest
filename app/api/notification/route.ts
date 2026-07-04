// app/api/notification/route.ts
import { headers } from "next/headers"
import type { NextRequest } from "next/server"
import { userOperations } from "@/db/operations"
import { notificationOperations } from "@/db/operations/notification-operations"
import logger from "@/utils/logger"
import { z } from "zod"

import {
  calculatePagination,
  extractPagination,
  generateETag,
  generateLinks,
  withRequestId,
  withRequestLogging,
  withTiming,
} from "@/lib/api-middleware"
import {
  rateLimitedResponse,
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
  withApiResponse,
} from "@/lib/api-response"
import { getAuthSession } from "@/lib/auth-helpers"
import { rateLimit } from "@/lib/rate-limiter"

// ============================================
// GET /api/notification - List Notifications
// ============================================
const getNotificationsSchema = z.object({
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("20"),
  unreadOnly: z.string().optional().default("false"),
  type: z
    .enum([
      "contribution",
      "penalty",
      "loan",
      "announcement",
      "action_item",
      "meeting",
      "message",
      "payment_received",
      "payment_failed",
      "system",
      "info",
    ])
    .optional(),
})

export const GET = withRequestLogging(
  withApiResponse(async (request: NextRequest) => {
    const { startTime } = withTiming()
    const { requestId } = withRequestId()

    // Apply rate limiting
    const rateLimitResult = await rateLimit("notifications-list", 100, 60, {
      algorithm: "sliding-window",
      analytics: true,
    })

    if (!rateLimitResult.success) {
      return rateLimitedResponse(request, rateLimitResult, {
        message: "Rate limit exceeded",
        startTime,
      })
    }

    // Verify session
    const session = await getAuthSession()

    if (!session) {
      return unauthorizedResponse(request, "Authentication required", {
        startTime,
      })
    }

    const user = await userOperations.findById(session.user.id as string)

    if (!user) {
      return unauthorizedResponse(request, "User not found", { startTime })
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url)
    const validatedParams = getNotificationsSchema.safeParse(
      Object.fromEntries(searchParams)
    )

    if (!validatedParams.success) {
      return validationErrorResponse(
        request,
        "Invalid query parameters",
        {
          validationErrors: validatedParams.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        { startTime }
      )
    }

    const params = validatedParams.data

    // Extract pagination parameters
    const { page, pageSize, offset } = extractPagination(request)

    let notifications

    if (params.unreadOnly === "true") {
      // Get only unread notifications
      notifications = await notificationOperations.findUnreadByUserId(user.id)
    } else {
      // Get all notifications
      notifications = await notificationOperations.findByUserId(
        user.id,
        pageSize,
        offset
      )
    }

    // Filter by type if provided
    if (params.type) {
      notifications = notifications.filter((n) => n.type === params.type)
    }

    // Get notification stats
    const stats = await notificationOperations.getUserNotificationStats(user.id)

    const totalItems = notifications.length
    const pagination = calculatePagination(page, pageSize, totalItems)

    // Generate HATEOAS links
    const baseLinks = {
      unread: "/api/notification?unreadOnly=true",
      markAllAsRead: "/api/notification/mark-all-read",
    }
    const links = generateLinks(request, pagination, baseLinks)

    return successResponse(
      request,
      {
        notifications,
        unreadCount: stats.unread, // Move to top level for hook compatibility
        stats,
        meta: {
          type: "notification_list",
          count: notifications.length,
          unreadOnly: params.unreadOnly === "true",
        },
      },
      {
        message: "Notifications retrieved successfully",
        startTime,
        pagination,
        links,
        cacheControl: "private, max-age=30",
        rateLimit: rateLimitResult,
        metadata: { etag: generateETag({ notifications, stats }), requestId },
      }
    )
  }, getNotificationsSchema)
)

// ============================================
// PATCH /api/notification - Mark All as Read
// ============================================
export const PATCH = withRequestLogging(async (request: NextRequest) => {
  const { startTime } = withTiming()
  const { requestId } = withRequestId()

  const rateLimitResult = await rateLimit(
    "notification-mark-all-read",
    30,
    60,
    {
      algorithm: "sliding-window",
      analytics: true,
    }
  )

  if (!rateLimitResult.success) {
    return rateLimitedResponse(request, rateLimitResult, {
      message: "Rate limit exceeded",
      startTime,
    })
  }

  // Verify session
  const session = await getAuthSession()

  if (!session) {
    return unauthorizedResponse(request, "Authentication required", {
      startTime,
    })
  }

  const user = await userOperations.findById(session.user.id as string)

  if (!user) {
    return unauthorizedResponse(request, "User not found", { startTime })
  }

  // Mark all notifications as read for this user
  const updatedCount = await notificationOperations.markAllAsReadForUser(
    user.id
  )

  logger.info("All notifications marked as read", {
    userId: user.id,
    updatedCount,
    requestId,
  })

  return successResponse(
    request,
    {
      updatedCount,
      meta: {
        type: "bulk_update",
      },
    },
    {
      message: `${updatedCount} notification${updatedCount !== 1 ? "s" : ""} marked as read`,
      startTime,
      rateLimit: rateLimitResult,
      cacheControl: "no-store",
      metadata: { requestId },
    }
  )
})

// ============================================
// DELETE /api/notification - Delete All Notifications
// ============================================
export const DELETE = withRequestLogging(async (request: NextRequest) => {
  const { startTime } = withTiming()
  const { requestId } = withRequestId()

  const rateLimitResult = await rateLimit("notification-delete-all", 10, 60, {
    algorithm: "sliding-window",
    analytics: true,
  })

  if (!rateLimitResult.success) {
    return rateLimitedResponse(request, rateLimitResult, {
      message: "Rate limit exceeded",
      startTime,
    })
  }

  // Verify session
  const session = await getAuthSession()

  if (!session) {
    return unauthorizedResponse(request, "Authentication required", {
      startTime,
    })
  }

  const user = await userOperations.findById(session.user.id as string)

  if (!user) {
    return unauthorizedResponse(request, "User not found", { startTime })
  }

  // Delete all notifications for this user
  const deletedCount = await notificationOperations.deleteAllForUser(user.id)

  logger.info("All notifications deleted", {
    userId: user.id,
    deletedCount,
    requestId,
  })

  return successResponse(
    request,
    {
      deletedCount,
      meta: {
        type: "bulk_delete",
      },
    },
    {
      message: `${deletedCount} notification${deletedCount !== 1 ? "s" : ""} deleted successfully`,
      startTime,
      rateLimit: rateLimitResult,
      cacheControl: "no-store",
      metadata: { requestId },
    }
  )
})
