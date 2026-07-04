// app/api/authentication/sessions/route.ts
import { headers } from "next/headers"
import type { NextRequest } from "next/server"
import { sessionOperations } from "@/db/operations"
import logger from "@/utils/logger"
import httpStatus from "http-status"
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
  errorResponse,
  rateLimitedResponse,
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
  withApiResponse,
} from "@/lib/api-response"
import { auth } from "@/lib/auth"
import { rateLimit } from "@/lib/rate-limiter"

// ============================================
// GET /api/authentication/sessions - List Active Sessions
// ============================================

// Input validation schema
const getSessionsSchema = z.object({
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("20"),
  sortBy: z
    .enum(["createdAt", "lastAccessedAt", "expiresAt"])
    .optional()
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
})

const { startTime } = withTiming()
const { requestId } = withRequestId()

export const GET = withRequestLogging(
  withApiResponse(async (request: NextRequest) => {
    try {
      // Apply rate limiting
      const rateLimitResult = await rateLimit("get-sessions", 60, 60 * 5, {
        algorithm: "sliding-window",
        analytics: true,
      })
      if (!rateLimitResult.success) {
        return rateLimitedResponse(request, rateLimitResult, {
          message: "Too many requests. Please try again later.",
          help: "You can make up to 60 requests per 5 minutes.",
          startTime,
        })
      }
      // Validate query parameters
      const { searchParams } = new URL(request.url)
      const validatedParams = getSessionsSchema.safeParse(
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
            help: "Please check the API documentation for valid query parameters: /docs/api/sessions",
            startTime,
          }
        )
      }

      const params = validatedParams.data

      // Extract pagination parameters
      const { page, pageSize, offset } = extractPagination(request)

      // Verify session
      const session = await auth.api.getSession({
        headers: await headers(),
      })

      const currentSessionId = session?.session.id as string
      if (!session) {
        return unauthorizedResponse(request, "Authentication required", {
          startTime,
          help: "You must login to have access.",
        })
      }

      const userId = session?.user.id as string
      const userRole = session?.user.role as string

      // Build filters (e.g., only allow admins to see all sessions if needed)
      const filters: any = { userId }
      if (userRole === "admin") {
        // Optionally allow admins to filter sessions differently
        filters.adminView = true
      }

      // Fetch active sessions
      const activeSessions = await sessionOperations.getActiveSessions({
        filters,
        limit: pageSize,
        offset,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      })

      // Get total count for pagination
      const totalItems = (
        await sessionOperations.getActiveSessions({ filters })
      ).length
      const pagination = calculatePagination(page, pageSize, totalItems)

      // Format sessions for response (remove sensitive data)
      const formattedSessions = activeSessions.map((session) => ({
        id: session.id,
        isCurrent: session.id === currentSessionId,
        deviceInfo: session.deviceInfo,
        location: session.location,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        lastAccessedAt: session.lastAccessedAt,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
      }))

      // Generate HATEOAS links
      const baseLinks = {
        self: "/api/authentication/sessions",
        login: "/api/authentication/login",
        logout: "/api/authentication/logout",
        documentation: "/docs/api/sessions",
      }
      const links = generateLinks(request, pagination, baseLinks)

      // Generate ETag for caching
      const etag = generateETag({ sessions: formattedSessions })

      return successResponse(
        request,
        {
          sessions: formattedSessions,
          meta: {
            type: "list",
            count: formattedSessions.length,
            userRole: userRole || "member",
          },
        },
        {
          message: "Sessions retrieved successfully",
          startTime,
          pagination,
          links,
          cacheControl: "private, max-age=60",
          warnings:
            formattedSessions.length === 0
              ? ["No active sessions found"]
              : undefined,
          rateLimit: rateLimitResult,
          metadata: { etag, requestId },
          statusCode: httpStatus.OK,
        }
      )
    } catch (error) {
      logger.error(`Get sessions error: ${error}`)
      return errorResponse(
        request,
        {
          code: "INTERNAL_ERROR",
          message: "Failed to retrieve sessions",
        },
        {
          statusCode: httpStatus.INTERNAL_SERVER_ERROR,
          startTime,
        }
      )
    }
  }, getSessionsSchema)
)
