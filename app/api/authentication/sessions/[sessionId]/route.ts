import { headers } from "next/headers"
import type { NextRequest } from "next/server"
import { auditLogOperations, sessionOperations } from "@/db/operations"
import logger from "@/utils/logger"
import httpStatus from "http-status"

import {
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
  withApiResponse,
} from "@/lib/api-response"
import { auth } from "@/lib/auth"
import { rateLimit } from "@/lib/rate-limiter"

// Input validation schema

const { startTime } = withTiming()
const { requestId } = withRequestId()

// DELETE - Terminate a specific session
export const DELETE = withRequestLogging(
  withApiResponse(
    async (
      request: NextRequest,
      props: { params: Promise<{ sessionId: string }> }
    ) => {
      try {
        // Apply rate limiting
        const rateLimitResult = await rateLimit("delete-session", 30, 60 * 5, {
          algorithm: "sliding-window",
          analytics: true,
        })
        if (!rateLimitResult.success) {
          return rateLimitedResponse(request, rateLimitResult, {
            message: "Too many requests. Please try again later.",
            help: "You can make up to 30 requests per 5 minutes.",
            startTime,
          })
        }

        // Validate parameters
        const params = await props.params

        const { sessionId } = params

        // Verify session
        const session = await auth.api.getSession({
          headers: await headers(),
        })
        if (!session) {
          return unauthorizedResponse(request, "Authentication required", {
            startTime,
            help: "You must login to have access.",
          })
        }

        const userId = session.user.id as string

        // Find the target session
        const targetSession = await sessionOperations.findByUserId(userId)
        const sessionToDelete = targetSession.find((s) => s.id === sessionId)

        if (!sessionToDelete) {
          return errorResponse(
            request,
            {
              code: "SESSION_NOT_FOUND",
              message: "Session not found or does not belong to you",
            },
            { statusCode: httpStatus.NOT_FOUND, startTime }
          )
        }

        // Check if user is trying to delete their current session
        const isDeletingCurrentSession =
          sessionToDelete.token === session.session.token

        // Delete the session
        const deleteResult = await sessionOperations.deleteByToken(
          sessionToDelete.token
        )

        if (!deleteResult) {
          return errorResponse(
            request,
            {
              code: "DELETE_FAILED",
              message: "Failed to terminate session",
            },
            { statusCode: httpStatus.INTERNAL_SERVER_ERROR, startTime }
          )
        }

        // Get location info from headers
        const headersList = await headers()
        const locationInfo = {
          ip: request.headers.get("x-forwarded-for") || "Unknown",
          userAgent: headersList.get("user-agent") || "Unknown",
        }

        // Log the session termination
        await auditLogOperations.create({
          action: "SESSION_TERMINATED",
          userId,
          details: `Session terminated. ${isDeletingCurrentSession ? "Current session" : "Remote session"} deleted.`,
          ipAddress: locationInfo.ip,
          userAgent: locationInfo.userAgent,
          severity: "medium",
          metadata: {
            terminatedSessionId: sessionId,
            terminatedSessionInfo: {
              userAgent: sessionToDelete.userAgent,
              ipAddress: sessionToDelete.ipAddress,
              lastAccessed: sessionToDelete.lastAccessedAt,
            },
            isCurrentSession: isDeletingCurrentSession,
          },
        })

        await auth.api.revokeSession({
          body: {
            token: sessionToDelete.token,
          },
          headers: await headers(),
        })

        // Generate HATEOAS links
        const baseLinks = {
          self: `/api/authentication/sessions/${sessionId}`,
          sessions: "/api/authentication/sessions",
          login: "/api/authentication/login",
          logout: "/api/authentication/logout",
          documentation: "/docs/api/sessions",
        }
        const links = generateLinks(request, undefined, baseLinks)

        // Generate ETag for response
        const etag = generateETag({ sessionId, isDeletingCurrentSession })

        return successResponse(
          request,
          {
            sessionId,
            wasCurrentSession: isDeletingCurrentSession,
            terminatedSession: {
              id: sessionToDelete.id,
              lastAccessed: sessionToDelete.lastAccessedAt,
              userAgent: sessionToDelete.userAgent,
              ipAddress: sessionToDelete.ipAddress,
            },
            meta: {
              type: "delete",
              userId,
            },
          },
          {
            message: isDeletingCurrentSession
              ? "Current session terminated successfully"
              : "Session terminated successfully",
            startTime,
            links,
            cacheControl: "no-cache",
            rateLimit: rateLimitResult,
            metadata: { etag, requestId },
            statusCode: httpStatus.OK,
          }
        )
      } catch (error) {
        logger.error(`Delete session error: ${error}`)

        await auditLogOperations.create({
          action: "SESSION_TERMINATION_ERROR",
          details: `Session termination error: ${error}`,
          ipAddress: request.headers.get("x-forwarded-for") || "Unknown",
          userAgent: request.headers.get("user-agent") || "Unknown",
          severity: "high",
        })

        return errorResponse(
          request,
          {
            code: "INTERNAL_ERROR",
            message: "Failed to terminate session",
          },
          {
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            startTime,
          }
        )
      }
    }
  )
)
