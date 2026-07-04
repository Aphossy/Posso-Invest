// app/api/notification/[id]/route.ts
import { headers } from "next/headers"
import type { NextRequest } from "next/server"
import { userOperations } from "@/db/operations"
import { notificationOperations } from "@/db/operations/notification-operations"
import logger from "@/utils/logger"

import {
  generateETag,
  withRequestId,
  withRequestLogging,
  withTiming,
} from "@/lib/api-middleware"
import {
  forbiddenResponse,
  notFoundResponse,
  rateLimitedResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/api-response"
import { getAuthSession } from "@/lib/auth-helpers"
import { rateLimit } from "@/lib/rate-limiter"

// ============================================
// GET /api/notification/[id] - Get Single Notification
// ============================================
export const GET = withRequestLogging(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { startTime } = withTiming()
    const { requestId } = withRequestId()
    const { id } = await params

    const rateLimitResult = await rateLimit("notification-get", 100, 60, {
      algorithm: "sliding-window",
      analytics: true,
    })

    if (!rateLimitResult.success) {
      return rateLimitedResponse(request, rateLimitResult, { startTime })
    }

    // Verify session
    const session = await getAuthSession()

    if (!session) {
      return unauthorizedResponse(request, "Authentication required", {
        startTime,
      })
    }

    const notification = await notificationOperations.findById(id)

    if (!notification) {
      return notFoundResponse(request, "Notification not found", { startTime })
    }

    // Check authorization
    const user = await userOperations.findById(session.user.id as string)
    if (!user) {
      return unauthorizedResponse(request, "User not found", { startTime })
    }

    if (notification.userId !== user.id) {
      return forbiddenResponse(
        request,
        "You don't have permission to access this notification",
        { startTime }
      )
    }

    return successResponse(
      request,
      {
        notification,
        meta: {
          type: "notification_detail",
        },
      },
      {
        message: "Notification retrieved successfully",
        startTime,
        rateLimit: rateLimitResult,
        cacheControl: "private, max-age=60",
        metadata: {
          etag: generateETag({ notification }),
          requestId,
        },
      }
    )
  }
)

// ============================================
// PATCH /api/notification/[id] - Mark as Read
// ============================================
export const PATCH = withRequestLogging(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { startTime } = withTiming()
    const { requestId } = withRequestId()
    const { id } = await params

    const rateLimitResult = await rateLimit("notification-update", 60, 60, {
      algorithm: "sliding-window",
      analytics: true,
    })

    if (!rateLimitResult.success) {
      return rateLimitedResponse(request, rateLimitResult, { startTime })
    }

    // Verify session
    const session = await getAuthSession()

    if (!session) {
      return unauthorizedResponse(request, "Authentication required", {
        startTime,
      })
    }

    const notification = await notificationOperations.findById(id)

    if (!notification) {
      return notFoundResponse(request, "Notification not found", { startTime })
    }

    // Check authorization
    const user = await userOperations.findById(session.user.id as string)
    if (!user) {
      return unauthorizedResponse(request, "User not found", { startTime })
    }

    if (notification.userId !== user.id) {
      return forbiddenResponse(
        request,
        "You don't have permission to update this notification",
        { startTime }
      )
    }

    const updatedNotification = await notificationOperations.markAsRead(id)

    logger.info("Notification marked as read", {
      notificationId: id,
      userId: user.id,
      requestId,
    })

    return successResponse(
      request,
      {
        notification: updatedNotification,
        meta: {
          type: "notification_update",
        },
      },
      {
        message: "Notification marked as read",
        startTime,
        rateLimit: rateLimitResult,
        cacheControl: "no-store",
        metadata: {
          etag: generateETag({ notification: updatedNotification }),
          requestId,
        },
      }
    )
  }
)

// ============================================
// DELETE /api/notification/[id] - Delete Notification
// ============================================
export const DELETE = withRequestLogging(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { startTime } = withTiming()
    const { requestId } = withRequestId()
    const { id } = await params

    const rateLimitResult = await rateLimit("notification-delete", 30, 60, {
      algorithm: "sliding-window",
      analytics: true,
    })

    if (!rateLimitResult.success) {
      return rateLimitedResponse(request, rateLimitResult, { startTime })
    }

    // Verify session
    const session = await getAuthSession()

    if (!session) {
      return unauthorizedResponse(request, "Authentication required", {
        startTime,
      })
    }

    const notification = await notificationOperations.findById(id)

    if (!notification) {
      return notFoundResponse(request, "Notification not found", { startTime })
    }

    // Check authorization
    const user = await userOperations.findById(session.user.id as string)
    if (!user) {
      return unauthorizedResponse(request, "User not found", { startTime })
    }

    if (notification.userId !== user.id) {
      return forbiddenResponse(
        request,
        "You don't have permission to delete this notification",
        { startTime }
      )
    }

    await notificationOperations.deleteById(id)

    logger.info("Notification deleted", {
      notificationId: id,
      userId: user.id,
      requestId,
    })

    return successResponse(
      request,
      {
        deletedCount: 1,
        meta: {
          type: "notification_delete",
          id,
        },
      },
      {
        message: "Notification deleted successfully",
        startTime,
        rateLimit: rateLimitResult,
        cacheControl: "no-store",
        metadata: { requestId },
      }
    )
  }
)
