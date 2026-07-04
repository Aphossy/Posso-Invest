import type { NextRequest } from "next/server"
import { userOperations } from "@/db/operations/user-operations"
import { sendWelcomeEmail } from "@/utils/auth-notification-utils"
import logger from "@/utils/logger"
import { notifyEmailVerified } from "@/utils/notification-utils"
import { verifyEmailToken } from "@/utils/verification-utils"
import { APIError } from "better-auth/api"

import { errorResponse, successResponse } from "@/lib/api-response"
import { auth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return errorResponse(
        request,
        {
          code: "VALIDATION_ERROR",
          message: "Verification token is required",
          details: { token: ["Token is missing"] },
        },
        { statusCode: 400 }
      )
    }

    logger.info(`Attempting to verify token: ${token.substring(0, 8)}...`)

    // Verify the token
    const verificationResult = await verifyEmailToken(token)

    if (!verificationResult.success || !verificationResult.email) {
      logger.warn(`Invalid or expired token: ${token.substring(0, 8)}...`)
      return errorResponse(
        request,
        {
          code: "INVALID_TOKEN",
          message: "Invalid or expired verification token",
        },
        { statusCode: 400 }
      )
    }

    // Update user verification status
    const user = (await userOperations.findByEmail(
      verificationResult.email
    )) as {
      id: string
      email: string
      firstName?: string
      isVerified: boolean
      emailVerifiedAt?: Date
    } | null

    if (!user) {
      logger.error(`User not found for email: ${verificationResult.email}`)
      return errorResponse(
        request,
        {
          code: "USER_NOT_FOUND",
          message: "User not found",
        },
        { statusCode: 404 }
      )
    }

    if (user.isVerified) {
      logger.info(`User already verified: ${verificationResult.email}`)
      return successResponse(request, {
        message: "Email already verified",
        statusCode: 200,
        user: {
          email: user.email,
          firstName: user.firstName,
          isVerified: true,
        },
      })
    }

    // Mark user as verified
    const updatedUser = (await userOperations.updateById(user.id, {
      emailVerified: true,
      emailVerifiedAt: new Date(),
    })) as unknown as {
      id: string
      email: string
      firstName?: string
      emailVerified: boolean
      emailVerifiedAt?: Date
    }

    logger.info(`User verified successfully: ${verificationResult.email}`)

    // Send welcome email
    try {
      await sendWelcomeEmail(user.email, user.firstName || "User")
      logger.info(`Welcome email sent to: ${user.email}`)
    } catch (emailError) {
      logger.error(`Failed to send welcome email: ${emailError}`)
      // Don't fail the verification if welcome email fails
    }

    // Send email verified notification
    try {
      await notifyEmailVerified(user.id)
    } catch (notificationError) {
      logger.error("Failed to send email verification notification", {
        error: notificationError,
        userId: user.id,
      })
      // Don't fail the verification if notification fails
    }

    return successResponse(
      request,
      {
        user: {
          id: updatedUser.id,
          firstName: updatedUser.firstName,
          email: updatedUser.email,
          // Add other fields as needed, e.g. lastName, role, avatarUrl
        },
      },
      {
        message: "Email verified successfully",
        statusCode: 200,
      }
    )
  } catch (error) {
    logger.error(`Email verification error: ${error}`)
    return errorResponse(
      request,
      {
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
        details:
          error instanceof Error ? { message: error.message } : undefined,
      },
      { statusCode: 500 }
    )
  }
}

// await auth.api.verifyEmail({
//     query: {
//         token: "my_token"
//     }
// })

try {
  const response = await auth.api.verifyEmail({
    query: {
      token: "my_token",
    },
    asResponse: true,
  })
} catch (error) {
  if (error instanceof APIError) {
    console.log(error.message, error.status)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return errorResponse(
        request,
        {
          code: "VALIDATION_ERROR",
          message: "Email is required",
          details: { email: ["Email is required"] },
        },
        { statusCode: 400 }
      )
    }

    logger.info(`Resending verification email to: ${email}`)

    // Check if user exists
    const user = (await userOperations.findByEmail(email)) as {
      id: string
      email: string
      firstName?: string
      isVerified: boolean
      emailVerifiedAt?: Date
    } | null

    if (!user) {
      // Don't reveal if user exists or not for security
      logger.info(
        `No user found with email: ${email}. Sending generic response.`
      )
      // Return success response to avoid revealing user existence
      return successResponse(request, {
        status: 200,
        message:
          "If an account with this email exists, a verification email has been sent",
      })
    }

    if (user.isVerified) {
      return errorResponse(
        request,
        {
          code: "ALREADY_VERIFIED",
          message: "Email is already verified",
        },
        { statusCode: 400 }
      )
    }

    // Import here to avoid circular dependency
    const { sendVerificationUserEmail } =
      await import("@/utils/verification-utils")

    await sendVerificationUserEmail(email, user.firstName || "User")

    return successResponse(request, {
      statusCode: 200,
      startTime: Date.now(),
      message: "Verification email sent successfully",
    })
  } catch (error) {
    logger.error(`Resend verification error: ${error}`)

    return errorResponse(
      request,
      {
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
        details:
          error instanceof Error ? { message: error.message } : undefined,
      },
      { statusCode: 500 }
    )
  }
}
