// C:\Users\user\OneDrive\Desktop\trustlink-group\app\api\message\[id]\route.ts
import { headers } from "next/headers"
import type { NextRequest } from "next/server"
import { db } from "@/db/connection"
import { messageOperations } from "@/db/operations/message-operations"
import { member } from "@/db/schemas"
import logger from "@/utils/logger"
import { extractRoleValue } from "@/utils/role-utils"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

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
  validationErrorResponse,
  withApiResponse,
} from "@/lib/api-response"
import { auth } from "@/lib/auth"
import { rateLimit } from "@/lib/rate-limiter"

async function resolveActiveRole(
  headersList: Headers,
  userId: string,
  activeOrganizationId?: string | null,
  contextLabel = "[message:role]"
) {
  let activeRole: string | null = null

  if (activeOrganizationId) {
    try {
      const rows = await db
        .select({ role: member.role })
        .from(member)
        .where(
          and(
            eq(member.organizationId, activeOrganizationId),
            eq(member.userId, userId)
          )
        )
        .limit(1)
      activeRole = rows[0]?.role ?? null
    } catch (error) {
      console.error(`${contextLabel} member lookup failed`, {
        userId,
        activeOrganizationId,
        error,
      })
    }
  }

  if (!activeRole) {
    try {
      const orgApi = auth.api as any
      const roleResponse = orgApi?.organization?.getActiveMemberRole
        ? await orgApi.organization.getActiveMemberRole({
            headers: headersList,
          })
        : null
      activeRole = extractRoleValue(roleResponse)
    } catch (error) {
      console.error(`${contextLabel} getActiveMemberRole fallback failed`, {
        userId,
        activeOrganizationId,
        error,
      })
    }
  }

  return activeRole
}

// ============================================
// GET /api/message/[id] - Get Single Message
// ============================================

export const GET = withRequestLogging(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { startTime } = withTiming()
    const { requestId } = withRequestId()

    const { id } = await params

    // Apply rate limiting
    const rateLimitResult = await rateLimit("messages-get", 60, 60, {
      algorithm: "sliding-window",
      analytics: true,
    })

    if (!rateLimitResult.success) {
      return rateLimitedResponse(request, rateLimitResult, {
        message: "Rate limit exceeded. Please wait and try again later.",
        help: "You can make up to 60 requests per minute.",
        startTime,
      })
    }

    // Verify authentication
    const headersList = await headers()
    const session = await auth.api.getSession({ headers: headersList })

    if (!session?.user) {
      return unauthorizedResponse(request, "Authentication required", {
        help: "Please sign in to view message details.",
        startTime,
      })
    }

    // Check authorization against active organization role
    const activeRole = await resolveActiveRole(
      headersList,
      session.user.id,
      session?.session?.activeOrganizationId,
      "[message:get]"
    )
    if (
      !["admin", "president", "secretary", "member"].includes(activeRole ?? "")
    ) {
      return forbiddenResponse(
        request,
        "You don't have permission to view this message",
        {
          help: "Only administrators, presidents, secretaries, and members can view messages.",
          startTime,
        }
      )
    }

    // Validate UUID
    const uuidSchema = z.string().uuid()
    const validation = uuidSchema.safeParse(id)

    if (!validation.success) {
      return validationErrorResponse(
        request,
        "Invalid message ID format",
        {
          validationErrors: [
            {
              path: "id",
              message: "Message ID must be a valid UUID",
            },
          ],
        },
        {
          help: "Please provide a valid message ID.",
          startTime,
        }
      )
    }

    // Fetch message with details
    const message = await messageOperations.findByIdWithDetails(id)

    if (!message) {
      return notFoundResponse(request, "Message not found", {
        help: "The message you're looking for doesn't exist or has been deleted.",
        startTime,
      })
    }

    // Auto-mark as read if not already
    if (!message.isRead) {
      await messageOperations.markAsRead(id)
      message.isRead = true
      message.readAt = new Date()
    }

    return successResponse(
      request,
      {
        message,
        meta: {
          hasResponses: message.responses?.length > 0,
          hasAttachments: message.attachments?.length > 0,
        },
      },
      {
        message: "Message retrieved successfully",
        startTime,
        links: {
          self: `/api/message/${id}`,
          update: `/api/message/${id}`,
          delete: `/api/message/${id}`,
          responses: `/api/message/${id}/responses`,
          markRead: `/api/message/${id}/mark-read`,
          markUnread: `/api/message/${id}/mark-unread`,
          star: `/api/message/${id}/star`,
          archive: `/api/message/${id}/archive`,
          list: "/api/message",
        },
        cacheControl: "private, max-age=30",
        rateLimit: rateLimitResult,
        metadata: { etag: generateETag({ message }), requestId },
      }
    )
  }
)

// ============================================
// PATCH /api/message/[id] - Update Message
// ============================================

const updateMessageSchema = z.object({
  status: z
    .enum(["new", "read", "in-progress", "resolved", "archived"])
    .optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  isStarred: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  internalNotes: z.string().optional(),
})

export const PATCH = withRequestLogging(
  withApiResponse(
    async (
      request: NextRequest,
      context: { params: Promise<{ id: string }> },
      validatedData: any
    ) => {
      const params = await context.params
      const { id } = params
      const { startTime } = withTiming()
      const { requestId } = withRequestId()

      // Apply rate limiting
      const rateLimitResult = await rateLimit("messages-update", 30, 60, {
        algorithm: "sliding-window",
        analytics: true,
      })

      if (!rateLimitResult.success) {
        return rateLimitedResponse(request, rateLimitResult, {
          message: "Rate limit exceeded. Please wait and try again later.",
          help: "You can make up to 30 requests per minute.",
          startTime,
        })
      }

      // Verify authentication
      const headersList = await headers()
      const session = await auth.api.getSession({ headers: headersList })

      if (!session?.user) {
        return unauthorizedResponse(request, "Authentication required", {
          help: "Please sign in to update messages.",
          startTime,
        })
      }

      // Check authorization against active organization role
      const activeRole = await resolveActiveRole(
        headersList,
        session.user.id,
        session?.session?.activeOrganizationId,
        "[message:update]"
      )

      if (!["admin", "secretary", "president"].includes(activeRole ?? "")) {
        return forbiddenResponse(
          request,
          "You don't have permission to update messages",
          {
            help: "Only administrators, presidents, secretaries, and members can update messages.",
            startTime,
          }
        )
      }

      // Validate UUID
      const uuidSchema = z.string().uuid()
      const validation = uuidSchema.safeParse(id)

      if (!validation.success) {
        return validationErrorResponse(
          request,
          "Invalid message ID format",
          {
            validationErrors: [
              {
                path: "id",
                message: "Message ID must be a valid UUID",
              },
            ],
          },
          {
            help: "Please provide a valid message ID.",
            startTime,
          }
        )
      }

      // Check if message exists
      const existingMessage = await messageOperations.findById(id)
      if (!existingMessage) {
        return notFoundResponse(request, "Message not found", {
          help: "The message you're trying to update doesn't exist.",
          startTime,
        })
      }

      // Update message
      const updatedMessage = await messageOperations.updateById(
        id,
        validatedData
      )

      // Log activity
      logger.info("Message updated", {
        messageId: id,
        updates: Object.keys(validatedData),
        updatedBy: session.user.id,
        requestId,
      })

      return successResponse(
        request,
        { message: updatedMessage },
        {
          message: "Message updated successfully",
          startTime,
          links: {
            self: `/api/message/${id}`,
            list: "/api/message",
          },
          cacheControl: "no-store",
          rateLimit: rateLimitResult,
          metadata: {
            etag: generateETag({ message: updatedMessage }),
            requestId,
          },
        }
      )
    },
    updateMessageSchema
  )
)

// ============================================
// DELETE /api/message/[id] - Delete Message
// ============================================

export const DELETE = withRequestLogging(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { startTime } = withTiming()
    const { requestId } = withRequestId()

    const { id } = await params

    // Apply rate limiting
    const rateLimitResult = await rateLimit("messages-delete", 20, 60, {
      algorithm: "sliding-window",
      analytics: true,
    })

    if (!rateLimitResult.success) {
      return rateLimitedResponse(request, rateLimitResult, {
        message: "Rate limit exceeded. Please wait and try again later.",
        help: "You can make up to 20 requests per minute.",
        startTime,
      })
    }

    // Verify authentication
    const headersList = await headers()
    const session = await auth.api.getSession({ headers: headersList })

    if (!session?.user) {
      return unauthorizedResponse(request, "Authentication required", {
        help: "Please sign in to delete messages.",
        startTime,
      })
    }

    // Check authorization against active organization role
    const activeRole = await resolveActiveRole(
      headersList,
      session.user.id,
      session?.session?.activeOrganizationId,
      "[message:delete]"
    )
    if (!["admin", "president"].includes(activeRole ?? "")) {
      return forbiddenResponse(
        request,
        "You don't have permission to delete messages",
        {
          help: "Only administrators and presidents can delete messages.",
          startTime,
        }
      )
    }

    // Validate UUID
    const uuidSchema = z.string().uuid()
    const validation = uuidSchema.safeParse(id)

    if (!validation.success) {
      return validationErrorResponse(
        request,
        "Invalid message ID format",
        {
          validationErrors: [
            {
              path: "id",
              message: "Message ID must be a valid UUID",
            },
          ],
        },
        {
          help: "Please provide a valid message ID.",
          startTime,
        }
      )
    }

    // Check if message exists
    const message = await messageOperations.findById(id)
    if (!message) {
      return notFoundResponse(request, "Message not found", {
        help: "The message you're trying to delete doesn't exist.",
        startTime,
      })
    }

    // Delete message
    const deleted = await messageOperations.deleteById(id)

    if (!deleted) {
      return notFoundResponse(request, "Failed to delete message", {
        help: "An error occurred while deleting the message.",
        startTime,
      })
    }

    // Log activity
    logger.info("Message deleted", {
      messageId: id,
      messageCode: message.messageCode,
      deletedBy: session.user.id,
      requestId,
    })

    return successResponse(
      request,
      {
        deletedMessage: {
          id: message.id,
          messageCode: message.messageCode,
          subject: message.subject,
        },
      },
      {
        message: "Message deleted successfully",
        startTime,
        links: {
          list: "/api/message",
          stats: "/api/message/stats",
        },
        cacheControl: "no-store",
        rateLimit: rateLimitResult,
        metadata: { requestId },
      }
    )
  }
)
