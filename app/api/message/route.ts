// C:\Users\user\OneDrive\Desktop\trustlink-group\app\api\message\route.ts
import { headers } from "next/headers"
import type { NextRequest } from "next/server"
import {
  advisorEmail,
  organisationEmail,
  presidentEmail,
  secretaryEmail,
} from "@/constants/organisation"
import { messageOperations } from "@/db/operations/message-operations"
import { AdminMessageNotificationEmail } from "@/emails/admin-message-notification"
import { ClientMessageConfirmationEmail } from "@/emails/client-message-confirmation"
import logger from "@/utils/logger"
import {
  getMessageLeadershipUserIds,
  notifyMessageReceived,
} from "@/utils/notification-utils"
import { render } from "@react-email/components"
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
  createdResponse,
  forbiddenResponse,
  rateLimitedResponse,
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
  withApiResponse,
} from "@/lib/api-response"
import { auth } from "@/lib/auth"
import { rateLimit } from "@/lib/rate-limiter"
import sendEmail from "@/lib/send-email"
import { createMessageApiSchema } from "@/lib/validators/message-validators"

// ============================================
// GET /api/message - List Messages (Admin)
// ============================================

const getMessagesSchema = z.object({
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("20"),
  search: z.string().optional(),
  status: z.string().optional(),
  service: z.string().optional(),
  priority: z.string().optional(),
  isRead: z.string().optional(),
  isStarred: z.string().optional(),
  isArchived: z.string().optional(),
  assignedTo: z.string().optional(),
  sortBy: z
    .enum(["createdAt", "name", "subject", "status", "priority"])
    .optional()
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
})

export const GET = withRequestLogging(
  withApiResponse(async (request: NextRequest) => {
    const { startTime } = withTiming()
    const { requestId } = withRequestId()

    // Apply rate limiting
    const rateLimitResult = await rateLimit("messages-list", 30, 60, {
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

    // Verify authentication and authorization
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return unauthorizedResponse(request, "Authentication required", {
        help: "Please sign in to access messages.",
        startTime,
      })
    }

    // Check user role and apply appropriate filters
    const userRole = session.user.role as string
    const canManageMessages = ["admin", "president", "secretary"].includes(
      userRole
    )

    // Regular users can only view their own messages
    const userEmail = session.user.email as string

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url)
    const validatedParams = getMessagesSchema.safeParse(
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
        {
          help: "Please check the API documentation for valid query parameters.",
          startTime,
        }
      )
    }

    const params = validatedParams.data

    // Extract pagination parameters
    const { page, pageSize, offset } = extractPagination(request)

    // Build filters
    const filters: any = {}

    // Regular users can only see their own messages
    if (!canManageMessages) {
      filters.email = userEmail
    }

    if (params.search) filters.search = params.search
    if (params.status) filters.status = params.status.split(",")
    if (params.service) filters.service = params.service.split(",")
    if (params.priority) filters.priority = params.priority.split(",")
    if (params.isRead) filters.isRead = params.isRead === "true"
    if (params.isStarred) filters.isStarred = params.isStarred === "true"
    if (params.isArchived) filters.isArchived = params.isArchived === "true"
    if (params.assignedTo && canManageMessages)
      filters.assignedTo = params.assignedTo

    // Fetch messages
    const messagesData = await messageOperations.findMany({
      filters,
      limit: pageSize,
      offset,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    })

    // Get total count for pagination
    const totalItems = await messageOperations.count({ filters })
    const pagination = calculatePagination(page, pageSize, totalItems)

    // Generate HATEOAS links
    const baseLinks = {
      stats: "/api/message/stats",
      unread: "/api/message?isRead=false",
      starred: "/api/message?isStarred=true",
      documentation: "/docs/api/message",
    }
    const links = generateLinks(request, pagination, baseLinks)

    return successResponse(
      request,
      {
        messages: messagesData,
        meta: {
          type: params.search ? "search" : "list",
          filters: Object.keys(filters).filter(
            (key) => filters[key] !== undefined
          ),
          count: messagesData.length,
          userRole,
        },
      },
      {
        message: "Messages retrieved successfully",
        startTime,
        pagination,
        links,
        cacheControl: "private, max-age=30",
        warnings:
          messagesData.length === 0
            ? ["No messages match the specified criteria"]
            : undefined,
        rateLimit: rateLimitResult,
        metadata: { etag: generateETag({ messages: messagesData }), requestId },
      }
    )
  }, getMessagesSchema)
)

// ============================================
// POST /api/message - Create Message (Public)
// ============================================

export const POST = withRequestLogging(
  withApiResponse(
    async (
      request: NextRequest,
      context: { params: Promise<any> },
      validatedData?: any
    ) => {
      const { startTime } = withTiming()
      const { requestId } = withRequestId()

      // Apply rate limiting - stricter for public endpoint
      const rateLimitResult = await rateLimit("messages-create", 4, 60 * 60, {
        algorithm: "sliding-window",
        analytics: true,
      })

      if (!rateLimitResult.success) {
        return rateLimitedResponse(request, rateLimitResult, {
          message: "Rate limit exceeded. Please wait and try again later.",
          help: "You can submit up to 4 messages per hour.",
          startTime,
        })
      }

      const messageData = validatedData

      // Get client information
      const headersList = await headers()
      const ipAddress =
        headersList.get("x-forwarded-for") ||
        headersList.get("x-real-ip") ||
        "unknown"
      const userAgent = headersList.get("user-agent") || "unknown"
      const referrer = headersList.get("referer") || headersList.get("referrer")

      // Generate message code
      const year = new Date().getFullYear()
      let latestMessageCode =
        await messageOperations.findLatestCodeForYear(year)
      let latestSequence = latestMessageCode
        ? Number.parseInt(latestMessageCode.split("-").pop() ?? "0", 10) || 0
        : 0

      const isMessageCodeUniqueConflict = (error: unknown): boolean => {
        const err = error as {
          message?: string
          cause?: { message?: string; code?: string }
          code?: string
        }

        return [err?.message, err?.cause?.message, err?.code, err?.cause?.code]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes("messages_message_code_unique")
          )
      }

      const maxCreateAttempts = 3
      let newMessage: Awaited<
        ReturnType<typeof messageOperations.create>
      > | null = null

      for (let attempt = 1; attempt <= maxCreateAttempts; attempt++) {
        const messageNumber = String(latestSequence + 1).padStart(4, "0")
        const messageCode = `MSG-${year}-${messageNumber}`

        try {
          newMessage = await messageOperations.create({
            ...messageData,
            messageCode,
            status: "new",
            priority: "medium",
            isRead: false,
            isStarred: false,
            isArchived: false,
            responseCount: "0",
            ipAddress,
            userAgent,
            referrer: referrer || undefined,
          })
          break
        } catch (error) {
          if (
            !isMessageCodeUniqueConflict(error) ||
            attempt === maxCreateAttempts
          ) {
            throw error
          }

          latestMessageCode =
            await messageOperations.findLatestCodeForYear(year)
          latestSequence = latestMessageCode
            ? Number.parseInt(latestMessageCode.split("-").pop() ?? "0", 10) ||
              0
            : latestSequence + 1
        }
      }

      if (!newMessage) {
        throw new Error(
          "Failed to create message after retrying unique conflicts"
        )
      }

      // Send confirmation email to client
      try {
        const clientEmailHtml = await render(
          ClientMessageConfirmationEmail({
            name: newMessage.name,
            messageCode: newMessage.messageCode!,
            subject: newMessage.subject,
            service: newMessage.service,
          })
        )

        await sendEmail({
          to: newMessage.email,
          subject: "We received your message - Posso Ventures",
          html: clientEmailHtml,
        })
      } catch (emailError) {
        logger.error("Failed to send confirmation email to client", {
          error: emailError,
          messageId: newMessage.id,
        })
      }

      // Send notification email to admin/support
      try {
        const adminEmailHtml = await render(
          AdminMessageNotificationEmail({
            messageCode: newMessage.messageCode!,
            name: newMessage.name,
            email: newMessage.email,
            phone: newMessage.phone,
            service: newMessage.service,
            subject: newMessage.subject,
            message: newMessage.message,
            createdAt: newMessage.createdAt.toISOString(),
          })
        )

        await sendEmail({
          to: [organisationEmail, secretaryEmail, presidentEmail, advisorEmail],
          subject: `New Contact Message: ${newMessage.subject}`,
          html: adminEmailHtml,
        })
      } catch (emailError) {
        logger.error("Failed to send notification email to admin", {
          error: emailError,
          messageId: newMessage.id,
        })
      }

      // Send in-app notifications to leadership
      try {
        const recipientUserIds = await getMessageLeadershipUserIds()
        if (recipientUserIds.length > 0) {
          await notifyMessageReceived(recipientUserIds, {
            messageCode: newMessage.messageCode!,
            name: newMessage.name,
            email: newMessage.email,
            subject: newMessage.subject,
            service: newMessage.service || "General Inquiry",
          })
        }
      } catch (notificationError) {
        logger.error("Failed to create message notifications", {
          error: notificationError,
          messageId: newMessage.id,
        })
        // Don't fail the request if notifications fail
      }

      // Log activity
      logger.info("Message created", {
        messageId: newMessage.id,
        messageCode: newMessage.messageCode,
        email: newMessage.email,
        service: newMessage.service,
        requestId,
      })

      return createdResponse(
        request,
        { message: newMessage },
        {
          message:
            "Message sent successfully! We'll get back to you as soon as possible.",
          startTime,
          location: `/api/message/${newMessage.id}`,
          rateLimit: rateLimitResult,
          links: {
            self: `/api/message/${newMessage.id}`,
            list: "/api/message",
          },
          cacheControl: "no-store",
          metadata: { etag: generateETag({ message: newMessage }), requestId },
        }
      )
    },
    createMessageApiSchema
  )
)
