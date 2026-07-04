import { headers } from "next/headers"
import type { NextRequest } from "next/server"
import { messageOperations } from "@/db/operations/message-operations"

import {
  generateETag,
  withRequestId,
  withRequestLogging,
  withTiming,
} from "@/lib/api-middleware"
import {
  forbiddenResponse,
  rateLimitedResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/api-response"
import { auth } from "@/lib/auth"
import { rateLimit } from "@/lib/rate-limiter"

// ============================================
// GET /api/message/stats - Get Message Statistics
// ============================================

export const GET = withRequestLogging(async (request: NextRequest) => {
  const { startTime } = withTiming()
  const { requestId } = withRequestId()

  // Apply rate limiting
  const rateLimitResult = await rateLimit("messages-stats", 20, 60, {
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
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    return unauthorizedResponse(request, "Authentication required", {
      help: "Please sign in to view statistics.",
      startTime,
    })
  }

  // Check authorization
  const userRole = session.user.role as string
  if (!["admin", "president", "secretary"].includes(userRole)) {
    return forbiddenResponse(
      request,
      "You don't have permission to view statistics",
      {
        help: "Only administrators, presidents, and secretaries can view message statistics.",
        startTime,
      }
    )
  }

  // Get statistics
  const stats = await messageOperations.getStats()

  return successResponse(
    request,
    {
      stats,
      meta: {
        calculatedAt: new Date().toISOString(),
      },
    },
    {
      message: "Statistics retrieved successfully",
      startTime,
      links: {
        self: "/api/message/stats",
        list: "/api/message",
        documentation: "/docs/api/message/stats",
      },
      cacheControl: "private, max-age=120",
      rateLimit: rateLimitResult,
      metadata: { etag: generateETag({ stats }), requestId },
    }
  )
})
