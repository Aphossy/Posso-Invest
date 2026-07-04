// app\api\settings\route.ts
import { headers } from "next/headers"
import type { NextRequest } from "next/server"
import { auditLogOperations, userOperations } from "@/db/operations"
import { type User } from "@/db/schemas"
import logger from "@/utils/logger"
import {
  notify2FAEnabled,
  notifyPasswordChanged,
  notifySettingsUpdated,
} from "@/utils/notification-utils"
import httpStatus from "http-status"
import { z } from "zod"

import { errorResponse, successResponse } from "@/lib/api-response"
import { getAuthSession } from "@/lib/auth-helpers"
import { rateLimit } from "@/lib/rate-limiter"

const updateSettingsSchema = z
  .object({
    email: z.string().email().optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(8).optional(),
    twoFactorEnabled: z.boolean().optional(),
    emailNotifications: z.boolean().optional(),
    smsNotifications: z.boolean().optional(),
    securityEmails: z.boolean().optional(),
    language: z.enum(["en", "rw", "fr"]).optional(),
    theme: z.enum(["light", "dark", "system"]).optional(),
  })
  .refine(
    (data) => {
      if (data.newPassword && !data.currentPassword) {
        return false
      }
      return true
    },
    {
      message: "Current password is required when changing password",
      path: ["currentPassword"],
    }
  )

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Rate limiting
    const rateLimitResult = await rateLimit("settings-get", 60, 60) // 60 requests per minute
    if (!rateLimitResult.success) {
      return errorResponse(
        request,
        {
          code: "RATE_LIMITED",
          message: "Too many requests. Please try again later.",
        },
        { statusCode: httpStatus.TOO_MANY_REQUESTS, startTime }
      )
    }

    // Verify session and get user
    const session = await getAuthSession()
    if (!session) {
      return errorResponse(
        request,
        {
          code: "INVALID_SESSION",
          message: "Invalid session",
        },
        { statusCode: httpStatus.UNAUTHORIZED, startTime }
      )
    }

    const user = await userOperations.getProfileByUserId(
      session.user.id as string
    )
    if (!user) {
      return errorResponse(
        request,
        {
          code: "USER_NOT_FOUND",
          message: "User not found",
        },
        { statusCode: httpStatus.NOT_FOUND, startTime }
      )
    }

    logger.info(`Settings retrieved for user: ${user.email}`)

    return successResponse(request, {
      message: "Settings retrieved successfully",
      statusCode: httpStatus.OK,
      settings: {
        email: user.email,
        twoFactorEnabled: user.twoFactorEnabled || false,
        emailNotifications: user.preferences?.notifications?.email ?? true,
        smsNotifications: user.preferences?.notifications?.sms ?? true,
        securityEmails: user.preferences?.notifications?.security ?? true,
        language: user.preferences?.language ?? "en",
        theme: user.preferences?.theme ?? "system",
        lastPasswordChange: user.passwordLastChanged,
        accountCreated: user.createdAt,
        lastLogin: user.lastLoginAt,
        isVerified: user.emailVerified,
      },
      startTime,
    })
  } catch (error) {
    logger.error("Get settings error:", { error })
    return errorResponse(
      request,
      {
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
      },
      { statusCode: httpStatus.INTERNAL_SERVER_ERROR, startTime }
    )
  }
}

export async function PATCH(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Rate limiting
    const rateLimitResult = await rateLimit("settings-update", 20, 60) // 20 updates per minute
    if (!rateLimitResult.success) {
      return errorResponse(
        request,
        {
          code: "RATE_LIMITED",
          message: "Too many requests. Please try again later.",
        },
        { statusCode: httpStatus.TOO_MANY_REQUESTS, startTime }
      )
    }

    // Verify session and get user
    const session = await getAuthSession()
    if (!session) {
      return errorResponse(
        request,
        {
          code: "INVALID_SESSION",
          message: "Invalid session",
        },
        { statusCode: httpStatus.UNAUTHORIZED, startTime }
      )
    }

    const user = await userOperations.findById(session.user.id as string)
    if (!user) {
      return errorResponse(
        request,
        {
          code: "USER_NOT_FOUND",
          message: "User not found",
        },
        { statusCode: httpStatus.NOT_FOUND, startTime }
      )
    }

    // Parse request body
    const body = await request.json()
    const updates = updateSettingsSchema.parse(body)

    const userUpdates: Partial<User> = {}

    // Handle email change
    if (updates.email && updates.email !== user.email) {
      const existingUser = await userOperations.findByEmail(updates.email)
      if (existingUser) {
        logger.warn(
          `Email change failed for user ${user.email}: email already exists`
        )
        return errorResponse(
          request,
          {
            code: "EMAIL_EXISTS",
            message: "Email already in use",
          },
          { statusCode: httpStatus.CONFLICT, startTime }
        )
      }
      userUpdates.email = updates.email
      userUpdates.emailVerified = false // Require re-verification
    }

    // Handle 2FA toggle
    if (typeof updates.twoFactorEnabled === "boolean") {
      userUpdates.twoFactorEnabled = updates.twoFactorEnabled
      if (updates.twoFactorEnabled) {
        userUpdates.twoFactorEnabledAt = new Date()
      }
    }

    // Handle preference updates
    const preferenceUpdates: Partial<NonNullable<User["preferences"]>> = {}
    const notifications: Partial<
      NonNullable<User["preferences"]>["notifications"]
    > = {}

    if (typeof updates.emailNotifications === "boolean") {
      notifications.email = updates.emailNotifications
    }
    if (typeof updates.smsNotifications === "boolean") {
      notifications.sms = updates.smsNotifications
    }

    if (typeof updates.securityEmails === "boolean") {
      notifications.security = updates.securityEmails
    }
    if (Object.keys(notifications).length > 0) {
      preferenceUpdates.notifications = {
        ...user.preferences?.notifications,
        ...notifications,
      }
    }

    if (updates.language) {
      preferenceUpdates.language = updates.language
    }
    if (updates.theme) {
      preferenceUpdates.theme = updates.theme
    }

    if (Object.keys(preferenceUpdates).length > 0) {
      userUpdates.preferences = {
        ...user.preferences,
        ...preferenceUpdates,
      }
    }

    // Update user
    let updatedUser: User | null = user
    if (Object.keys(userUpdates).length > 0) {
      updatedUser = await userOperations.updateById(
        session.user.id as string,
        userUpdates
      )
      if (!updatedUser) {
        return errorResponse(
          request,
          {
            code: "FAILED_TO_UPDATE_SETTINGS",
            message: "Failed to update settings",
          },
          { statusCode: httpStatus.INTERNAL_SERVER_ERROR, startTime }
        )
      }
    }

    // Get location info from headers for audit log
    const headersList = await headers()
    const locationInfo = {
      ip: request.headers.get("x-forwarded-for") || "Unknown",
      userAgent: headersList.get("user-agent") || "Unknown",
    }

    // Create audit log (with error handling)
    try {
      const auditData = {
        userId: session.user.id as string,
        userEmail: user.email,
        action: "SETTINGS_UPDATE",
        resourceType: "settings",
        resourceId: session.user.id as string,
        details: "Settings updated",
        metadata: {
          changes: Object.keys(updates).filter(
            (key) => key !== "currentPassword" && key !== "newPassword"
          ),
          passwordChanged: !!updates.newPassword,
          emailChanged: !!updates.email,
        },
        ipAddress: locationInfo.ip.substring(0, 45),
        userAgent: locationInfo.userAgent.substring(0, 200),
        sessionId: session.session.id.substring(0, 100),
        severity: updates.newPassword || updates.email ? "warning" : "info",
      }

      await auditLogOperations.create(auditData)
    } catch (auditError) {
      logger.warn("Failed to create audit log for settings update:", {
        error: auditError,
      })
      // Don't fail the request if audit logging fails
    }

    logger.info(`Settings updated for user: ${user.email}`)

    // Send in-app notifications for important settings changes
    try {
      const changedFields = Object.keys(updates).filter(
        (key) => key !== "currentPassword" && key !== "newPassword"
      )

      // Notify about password change
      if (updates.newPassword) {
        await notifyPasswordChanged(session.user.id as string)
      }

      // Notify about 2FA enabled
      if (updates.twoFactorEnabled && !user.twoFactorEnabled) {
        await notify2FAEnabled(session.user.id as string)
      }

      // General settings update notification (only if not password or 2FA change)
      if (
        changedFields.length > 0 &&
        !updates.newPassword &&
        !updates.twoFactorEnabled
      ) {
        await notifySettingsUpdated(
          session.user.id as string,
          changedFields.map((f) =>
            f === "emailNotifications"
              ? "Email Notifications"
              : f === "smsNotifications"
                ? "SMS Notifications"
                : f === "securityEmails"
                  ? "Security Emails"
                  : f === "language"
                    ? "Language"
                    : f === "theme"
                      ? "Theme"
                      : f === "email"
                        ? "Email Address"
                        : f
          )
        )
      }
    } catch (notificationError) {
      logger.error("Failed to send settings update notifications", {
        error: notificationError,
        userId: session.user.id,
      })
      // Don't fail the request if notifications fail
    }

    return successResponse(request, {
      settings: {
        email: updatedUser.email,
        twoFactorEnabled: updatedUser.twoFactorEnabled || false,
        emailNotifications:
          updatedUser.preferences?.notifications?.email ?? true,
        smsNotifications: updatedUser.preferences?.notifications?.sms ?? true,
        securityEmails:
          updatedUser.preferences?.notifications?.security ?? true,
        language: updatedUser.preferences?.language ?? "en",
        theme: updatedUser.preferences?.theme ?? "system",
        lastPasswordChange: updatedUser.passwordLastChanged,
        accountCreated: updatedUser.createdAt,
        lastLogin: updatedUser.lastLoginAt,
        isVerified: updatedUser.emailVerified,
      },
      message: "Settings updated successfully",
      requiresVerification: !!updates.email,
      statusCode: httpStatus.OK,
      startTime,
    })
  } catch (error) {
    logger.error("Update settings error:", { error })
    if (error instanceof z.ZodError) {
      return errorResponse(
        request,
        {
          code: "INVALID_REQUEST_DATA",
          message: `Invalid request data ${JSON.stringify(error.issues)}`,
          details: error.issues,
        },
        { statusCode: httpStatus.BAD_REQUEST, startTime }
      )
    }
    return errorResponse(
      request,
      {
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
      },
      { statusCode: httpStatus.INTERNAL_SERVER_ERROR, startTime }
    )
  }
}
