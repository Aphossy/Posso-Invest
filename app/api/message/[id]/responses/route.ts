import { headers } from "next/headers"
import type { NextRequest } from "next/server"
import {
  messageOperations,
  messageResponseOperations,
} from "@/db/operations/message-operations"
import { z } from "zod"

import {
  withRequestId,
  withRequestLogging,
  withTiming,
} from "@/lib/api-middleware"
import {
  createdResponse,
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

// ============================================
// GET /api/message/[id]/responses
// ============================================

export const GET = withRequestLogging(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { startTime } = withTiming()
    const { id } = await params

    const rateLimitResult = await rateLimit("message-responses-get", 60, 60, {
      algorithm: "sliding-window",
    })
    if (!rateLimitResult.success) {
      return rateLimitedResponse(request, rateLimitResult, { startTime })
    }

    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return unauthorizedResponse(request, "Authentication required", {
        startTime,
      })
    }

    const message = await messageOperations.findById(id)
    if (!message) {
      return notFoundResponse(request, "Message not found", { startTime })
    }

    // Members can only view responses on their own tickets
    const userRole = session.user.role as string
    const canManageMessages = ["admin", "president", "secretary"].includes(
      userRole
    )
    if (!canManageMessages && message.email !== session.user.email) {
      return forbiddenResponse(request, "Access denied", { startTime })
    }

    const responses = await messageResponseOperations.findByMessageId(id)
    // Hide internal notes from non-admins
    const filtered = canManageMessages
      ? responses
      : responses.filter((r) => !r.isInternal)

    return successResponse(
      request,
      { responses: filtered },
      { message: "Responses retrieved successfully", startTime }
    )
  }
)

// ============================================
// POST /api/message/[id]/responses - Admin only
// ============================================

const createResponseSchema = z.object({
  content: z.string().min(1, "Response content is required"),
  isInternal: z.boolean().optional().default(false),
})

export const POST = withRequestLogging(
  withApiResponse(
    async (
      request: NextRequest,
      { params }: { params: Promise<{ id: string }> },
      validatedData?: any
    ) => {
      const { startTime } = withTiming()
      const { requestId } = withRequestId()
      const { id } = await params

      const rateLimitResult = await rateLimit(
        "message-responses-create",
        20,
        60,
        { algorithm: "sliding-window" }
      )
      if (!rateLimitResult.success) {
        return rateLimitedResponse(request, rateLimitResult, { startTime })
      }

      const session = await auth.api.getSession({ headers: await headers() })
      if (!session?.user) {
        return unauthorizedResponse(request, "Authentication required", {
          startTime,
        })
      }

      const userRole = session.user.role as string
      if (!["admin", "president", "secretary"].includes(userRole)) {
        return forbiddenResponse(
          request,
          "Only admins, presidents, and secretaries can respond to messages",
          { startTime }
        )
      }

      const message = await messageOperations.findById(id)
      if (!message) {
        return notFoundResponse(request, "Message not found", { startTime })
      }

      const { content, isInternal } = validatedData

      const response = await messageResponseOperations.create({
        messageId: id,
        content,
        isInternal: isInternal ?? false,
        responderId: session.user.id,
        responderName: session.user.name ?? null,
        responderEmail: session.user.email ?? null,
        emailSent: false,
      })

      // Auto-advance status to in-progress if it was new/read
      if (message.status === "new" || message.status === "read") {
        await messageOperations.updateById(id, { status: "in-progress" })
      }

      return createdResponse(
        request,
        { response },
        {
          message: "Response sent successfully",
          startTime,
          metadata: { requestId },
        }
      )
    },
    createResponseSchema
  )
)
