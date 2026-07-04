import { headers } from "next/headers"
import type { NextRequest } from "next/server"
import { auditLogOperations, sessionOperations } from "@/db/operations"
import logger from "@/utils/logger"
import httpStatus from "http-status"

import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/api-response"
import { auth } from "@/lib/auth"
import { rateLimit } from "@/lib/rate-limiter"

export async function POST(request: NextRequest) {
  const startTime = performance.now()

  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit("logout-all", 10, 60 * 15) // 10 attempts per 15 minutes
    if (!rateLimitResult.success) {
      return errorResponse(
        request,
        {
          code: "RATE_LIMITED",
          message: "Too many logout all attempts. Please try again later.",
        },
        { statusCode: 429, startTime }
      )
    }

    // Get and verify session token
    const session = await auth.api.getSession({
      headers: await headers(),
    })
    if (!session) {
      return unauthorizedResponse(request, "Authentication required", {
        startTime,
        help: "You must login to logout.",
      })
    }

    const userId = session.user.id as string

    // Get location info from headers
    const headersList = await headers()
    const locationInfo = {
      ip: request.headers.get("x-forwarded-for") || "Unknown",
      userAgent: headersList.get("user-agent") || "Unknown",
    }

    // Get all active sessions for the user
    const activeSessions = await sessionOperations.getActiveSessions({
      filters: { userId },
    })
    const sessionCount = activeSessions.length

    // Deactivate all sessions for the user
    const deleteResult = await sessionOperations.deleteByUserId(userId)

    if (!deleteResult) {
      logger.warn(`Failed to delete all sessions for user: ${userId}`)
      return errorResponse(
        request,
        {
          code: "LOGOUT_ALL_FAILED",
          message: "Failed to logout from all devices",
        },
        { statusCode: httpStatus.INTERNAL_SERVER_ERROR, startTime }
      )
    }

    await auth.api.revokeSessions({
      headers: await headers(),
    })

    // Log the logout all action
    await auditLogOperations.create({
      action: "LOGOUT_ALL_SUCCESS",
      userId,
      details: `User logged out from all devices. ${sessionCount} sessions terminated.`,
      ipAddress: locationInfo.ip,
      userAgent: locationInfo.userAgent,
      severity: "medium",
      metadata: {
        sessionCount,
        terminatedSessions: activeSessions.map((s) => ({
          id: s.id,
          lastAccessed: s.lastAccessedAt,
          userAgent: s.userAgent,
          ipAddress: s.ipAddress,
        })),
      },
    })

    logger.info(
      `User ${userId} logged out from all devices. ${sessionCount} sessions terminated.`
    )

    return successResponse(request, {
      message: "Logged out from all devices successfully",
      sessionsTerminated: sessionCount,
      terminatedSessions: activeSessions.map((s) => ({
        id: s.id,
        lastAccessed: s.lastAccessedAt,
        userAgent: s.userAgent,
        ipAddress: s.ipAddress,
      })),
      statusCode: httpStatus.OK,
      startTime,
    })
  } catch (error) {
    logger.error(`Logout all error: ${error}`)

    await auditLogOperations.create({
      action: "LOGOUT_ALL_ERROR",
      details: `Logout all error: ${error}`,
      ipAddress: request.headers.get("x-forwarded-for") || "Unknown",
      userAgent: request.headers.get("user-agent") || "Unknown",
      severity: "high",
    })

    return errorResponse(
      request,
      {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred during logout",
      },
      { statusCode: httpStatus.INTERNAL_SERVER_ERROR, startTime }
    )
  }
}
