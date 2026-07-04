// app\api\auth\logout\route.ts
import { headers } from "next/headers"
import type { NextRequest } from "next/server"
import { auditLogOperations } from "@/db/operations"
import logger from "@/utils/logger"
import httpStatus from "http-status"

import { errorResponse, successResponse } from "@/lib/api-response"
import { auth } from "@/lib/auth"
import { rateLimit } from "@/lib/rate-limiter"

export async function POST(request: NextRequest) {
  const startTime = performance.now()

  try {
    // Apply rate limiting (more lenient for logout)
    const rateLimitResult = await rateLimit("logout", 100, 60 * 5) // 100 attempts per 5 minutes
    if (!rateLimitResult.success) {
      return errorResponse(
        request,
        {
          code: "RATE_LIMITED",
          message: "Too many logout attempts. Please try again later.",
        },
        { statusCode: 429, startTime }
      )
    }

    // Get session token from cookies
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session) {
      logger.warn("Logout attempt without session token")
      return errorResponse(
        request,
        {
          code: "NO_SESSION",
          message: "No active session found",
        },
        { statusCode: httpStatus.BAD_REQUEST, startTime }
      )
    }

    // Get location info from headers
    const headersList = await headers()
    const locationInfo = {
      ip: request.headers.get("x-forwarded-for") || "Unknown",
      userAgent: headersList.get("user-agent") || "Unknown",
    }

    if (session) {
      // Log the logout action
      await auditLogOperations.create({
        action: "LOGOUT_SUCCESS",
        userId: session.user.id,
        details: "User logged out successfully",
        ipAddress: locationInfo.ip,
        userAgent: locationInfo.userAgent,
        sessionId: session.session.id,
        severity: "info",
      })

      logger.info(
        `User logged out successfully. Session ID: ${session.session.id}`
      )
    }

    // Delete session from database and clear cookie
    const deleteResult = await auth.api.signOut({ headers: await headers() })

    if (!deleteResult) {
      logger.warn("Failed to delete session during logout")
      return errorResponse(
        request,
        {
          code: "LOGOUT_FAILED",
          message: "Failed to complete logout",
        },
        { statusCode: httpStatus.INTERNAL_SERVER_ERROR, startTime }
      )
    }

    return successResponse(request, {
      message: "Logged out successfully",
      statusCode: httpStatus.OK,
      startTime,
    })
  } catch (error) {
    logger.error(`Logout error: ${error}`)

    await auditLogOperations.create({
      action: "LOGOUT_ERROR",
      details: `Logout error: ${error}`,
      ipAddress: request.headers.get("x-forwarded-for") || "Unknown",
      userAgent: request.headers.get("user-agent") || "Unknown",
      severity: "medium",
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
