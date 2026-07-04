// app\api\profile\route.ts

import { headers } from "next/headers"
import type { NextRequest } from "next/server"
import { auditLogOperations, userOperations } from "@/db/operations"
import { User } from "@/db/schemas"
import logger from "@/utils/logger"
import { extractRoleValue } from "@/utils/role-utils"
import httpStatus from "http-status"
import * as z from "zod"

import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/api-response"
import { auth } from "@/lib/auth"
import { getAuthSession } from "@/lib/auth-helpers"
import { rateLimit } from "@/lib/rate-limiter"

const IKIMINA_ALLOWED_ROLES = new Set([
  "member",
  "treasurer",
  "president",
  "admin",
])

const updateProfileSchema = z.object({
  name: z
    .string()
    .min(1, "Names are required")
    .max(100, "Names are too long")
    .optional(),
  phone: z
    .string()
    // .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format")
    .max(20, "Phone too long")
    .optional(),
  dateOfBirth: z
    .string()
    .refine((date) => {
      const parsed = new Date(date)
      return !isNaN(parsed.getTime())
    }, "Invalid date format")
    .refine((date) => {
      const parsed = new Date(date)
      const now = new Date()
      const age = now.getFullYear() - parsed.getFullYear()
      return age >= 5 && age <= 120
    }, "Invalid date of birth")
    .transform((date) => new Date(date).toISOString().split("T")[0])
    .optional(),
  bio: z.string().max(500, "Bio too long").optional(),
  image: z.string().optional().nullable(),

  // Address aligned to schema structure
  address: z
    .object({
      district: z.string().min(1, "District is required").max(100).optional(),
      sector: z.string().min(1, "Sector is required").max(100).optional(),
      cell: z.string().min(1, "Cell is required").max(100).optional(),
      village: z.string().min(1, "Village is required").max(100).optional(),
      city: z.string().min(1, "City is required").max(100).optional(),
    })
    .optional()
    .refine((val) => {
      if (!val) return true
      return Object.values(val).some((v) => v && v.trim() !== "")
    }, "At least one address field is required"),

  metadata: z
    .object({
      ikiminaProfile: z
        .object({
          bankName: z.string().max(120, "Bank name is too long").optional(),
          bankAccountNumber: z
            .string()
            .max(40, "Bank account number is too long")
            .optional(),
          bankAccountHolder: z
            .string()
            .max(120, "Account holder name is too long")
            .optional(),
          preferredPayoutMethod: z
            .enum(["bank", "mobile_money", "cash"])
            .optional(),
          mobileMoneyProvider: z.enum(["mtn", "airtel", "other"]).optional(),
          mobileMoneyNumber: z
            .string()
            .max(20, "Mobile money number is too long")
            .optional(),
          emergencyContactName: z
            .string()
            .max(120, "Emergency contact name is too long")
            .optional(),
          emergencyContactPhone: z
            .string()
            .max(20, "Emergency contact phone is too long")
            .optional(),
        })
        .optional(),
    })
    .optional(),
})

export type UpdateProfileData = z.infer<typeof updateProfileSchema>

export async function GET(request: NextRequest) {
  const startTime = performance.now()

  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit("profile-get", 60, 60) // 60 requests per minute
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
          code: "UNAUTHORIZED",
          message: "Invalid or expired session",
        },
        { statusCode: httpStatus.UNAUTHORIZED, startTime }
      )
    }

    // Get full user profile (merged)
    const userProfile = await userOperations.getProfileByUserId(
      session.user.id as string
    )
    if (!userProfile) {
      return errorResponse(
        request,
        {
          code: "NOT_FOUND",
          message: "User not found",
        },
        { statusCode: httpStatus.NOT_FOUND, startTime }
      )
    }

    // Remove sensitive data
    const {
      failedLoginAttempts,
      lockoutUntil,
      passwordLastChanged,
      twoFactorEnabledAt,
      lastLoginMethod,
      banReason,
      banExpires,
      ...safeUser
    } = userProfile

    logger.info(`Profile retrieved for user: ${userProfile.email}`)

    return successResponse(request, {
      user: safeUser,
      message: "Profile retrieved successfully",
      startTime,
    })
  } catch (error) {
    logger.error("Get profile error:", { error })
    return errorResponse(
      request,
      {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      },
      { statusCode: httpStatus.INTERNAL_SERVER_ERROR, startTime }
    )
  }
}

export async function PATCH(request: NextRequest) {
  const startTime = performance.now()

  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit("profile-update", 20, 60) // 20 updates per minute
    if (!rateLimitResult.success) {
      return errorResponse(
        request,
        {
          code: "RATE_LIMITED",
          message: "Too many update requests. Please try again later.",
        },
        { statusCode: httpStatus.TOO_MANY_REQUESTS, startTime }
      )
    }

    // Verify session and get user
    const session = await getAuthSession()
    if (!session) {
      return unauthorizedResponse(request, "Authentication required", {
        startTime,
      })
    }

    const user = await userOperations.findById(session.user.id as string)
    if (!user) {
      return errorResponse(
        request,
        {
          code: "NOT_FOUND",
          message: "User not found",
        },
        { statusCode: httpStatus.NOT_FOUND, startTime }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = updateProfileSchema.safeParse(body)

    if (!validatedData.success) {
      logger.warn(
        `Invalid profile update attempt: ${JSON.stringify(validatedData.error.flatten().fieldErrors)}`
      )
      return errorResponse(
        request,
        {
          code: "VALIDATION_ERROR",
          message: `Invalid profile update attempt: ${JSON.stringify(validatedData.error.flatten().fieldErrors)}`,
          details: validatedData.error.flatten().fieldErrors,
        },
        { statusCode: httpStatus.BAD_REQUEST, startTime }
      )
    }

    const updates = validatedData.data

    // Get location info from headers
    const headersList = await headers()
    const locationInfo = {
      ip: request.headers.get("x-forwarded-for") || "Unknown",
      userAgent: headersList.get("user-agent") || "Unknown",
    }

    const hasIkiminaUpdate = updates.metadata?.ikiminaProfile !== undefined
    if (hasIkiminaUpdate) {
      let resolvedRole = session.user?.role ?? null

      try {
        const orgApi = (auth.api as any).organization
        const roleResponse = orgApi?.getActiveMemberRole
          ? await orgApi.getActiveMemberRole({ headers: headersList })
          : null
        resolvedRole = extractRoleValue(roleResponse) ?? resolvedRole
      } catch (roleError) {
        logger.warn("Failed to resolve active member role for profile update", {
          error: roleError,
          userId: session.user.id,
        })
      }

      if (!resolvedRole || !IKIMINA_ALLOWED_ROLES.has(resolvedRole)) {
        return errorResponse(
          request,
          {
            code: "FORBIDDEN",
            message:
              "You do not have permission to update Ikimina payout details.",
            details: {
              role: resolvedRole,
              allowedRoles: [...IKIMINA_ALLOWED_ROLES],
            },
          },
          { statusCode: httpStatus.FORBIDDEN, startTime }
        )
      }
    }

    // Merge all updates into single object for user table
    const mergedUpdates: Partial<User> = {}

    // Basic user fields
    if (updates.name !== undefined) mergedUpdates.name = updates.name
    if (updates.phone !== undefined) mergedUpdates.phone = updates.phone
    if (updates.dateOfBirth !== undefined)
      mergedUpdates.dateOfBirth = updates.dateOfBirth
    if (updates.bio !== undefined) mergedUpdates.bio = updates.bio
    if (updates.address !== undefined) mergedUpdates.address = updates.address

    // Avatar
    if (updates.image !== undefined) mergedUpdates.image = updates.image

    // Ikimina profile metadata (merge to avoid removing unrelated metadata keys)
    if (updates.metadata !== undefined) {
      const existingMetadata = user.metadata || {}
      const existingIkiminaProfile = existingMetadata.ikiminaProfile || {}
      const incomingIkiminaProfile = updates.metadata.ikiminaProfile || {}

      mergedUpdates.metadata = {
        ...existingMetadata,
        ...updates.metadata,
        ikiminaProfile: {
          ...existingIkiminaProfile,
          ...incomingIkiminaProfile,
        },
      }
    }

    // Perform single update
    const updatedUser = await userOperations.updateById(
      session.user.id as string,
      mergedUpdates
    )
    if (!updatedUser) {
      return errorResponse(
        request,
        {
          code: "INTERNAL_ERROR",
          message: "Failed to update profile",
        },
        { statusCode: httpStatus.INTERNAL_SERVER_ERROR, startTime }
      )
    }

    // Create audit log with truncated data to prevent varchar overflow
    try {
      const changedFields = Object.keys(updates)
      const truncatedChanges = JSON.stringify(updates).substring(0, 1000) // Limit to 1000 chars
      const truncatedSessionId = session.session.id.substring(0, 100) // Limit session ID
      const truncatedUserAgent = locationInfo.userAgent.substring(0, 200) // Limit user agent

      await auditLogOperations.create({
        userId: session.user.id as string,
        userEmail: updatedUser.email,
        action: "PROFILE_UPDATE",
        resourceType: "profile",
        resourceId: session.user.id as string,
        details: `Profile updated: ${changedFields.join(", ")}`,
        metadata: { changes: truncatedChanges },
        ipAddress: locationInfo.ip.substring(0, 45), // Limit IP address
        userAgent: truncatedUserAgent,
        sessionId: truncatedSessionId,
        severity: "info",
      })
    } catch (auditError) {
      // Log audit error but don't fail the request
      logger.warn("Failed to create audit log:", { error: auditError })
    }

    // Remove sensitive data
    const {
      failedLoginAttempts,
      lockoutUntil,
      passwordLastChanged,
      twoFactorEnabledAt,
      lastLoginMethod,
      banReason,
      banExpires,
      ...safeUser
    } = updatedUser

    logger.info(`Profile updated for user: ${updatedUser.email}`)

    return successResponse(request, {
      user: safeUser,
      message: "Profile updated successfully",
      startTime,
    })
  } catch (error) {
    logger.error("Update profile error:", { error })

    if (error instanceof z.ZodError) {
      return errorResponse(
        request,
        {
          code: "VALIDATION_ERROR",
          message: "Invalid profile data",
          details: error.flatten().fieldErrors,
        },
        { statusCode: httpStatus.BAD_REQUEST, startTime }
      )
    }

    return errorResponse(
      request,
      {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      },
      { statusCode: httpStatus.INTERNAL_SERVER_ERROR, startTime }
    )
  }
}
