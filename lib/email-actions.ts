"use server"

import React from "react"
import type { User } from "@/db/schemas"
import AdminDirectUserMessageEmail from "@/emails/admin-direct-user-message-email"
import {
  sendAccountBannedEmail,
  sendAccountSuspendedEmail,
  sendAccountUnbannedEmail,
} from "@/utils/auth-notification-utils"

import sendEmail from "@/lib/send-email"

interface SendBanEmailParams {
  userName: string
  userEmail: string
  banType: "temporary" | "permanent"
  banExpiresInDays?: string
  banReason: string
}

interface SendUnbanEmailParams {
  userName: string
  userEmail: string
  originalBanReason?: string
  wasPermanent?: boolean
}

interface SendBannedUserLoginAttemptParams {
  user: {
    name: string
    email: string
    banReason?: string | null
  }
  ipAddress: string
  userAgent: string
  attemptTime: string
  location?: {
    city?: string
    country?: string
  }
}

interface SendDirectUserEmailParams {
  userName: string
  userEmail: string
  subject: string
  message: string
  cc?: string[]
  bcc?: string[]
}

interface EmailActionResult {
  success: boolean
  error?: string
}

/**
 * Server action to send an admin-authored message email to a user
 */
export async function sendDirectUserEmail(
  params: SendDirectUserEmailParams
): Promise<EmailActionResult> {
  try {
    const { userName, userEmail, subject, message, cc, bcc } = params

    if (!userName || !userEmail || !subject || !message) {
      return {
        success: false,
        error: "Missing required parameters for sending user email",
      }
    }

    const normalizedSubject = subject.trim()
    const normalizedMessage = message.trim()

    const normalizedCc = (cc || []).map((email) => email.trim()).filter(Boolean)
    const normalizedBcc = (bcc || [])
      .map((email) => email.trim())
      .filter(Boolean)

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const hasInvalidCc = normalizedCc.some((email) => !emailRegex.test(email))
    const hasInvalidBcc = normalizedBcc.some((email) => !emailRegex.test(email))

    if (!normalizedSubject || !normalizedMessage) {
      return {
        success: false,
        error: "Subject and message are required",
      }
    }

    if (hasInvalidCc || hasInvalidBcc) {
      return {
        success: false,
        error: "One or more CC/BCC addresses are invalid",
      }
    }

    const result = await sendEmail({
      to: userEmail,
      cc: normalizedCc.length > 0 ? normalizedCc : undefined,
      bcc: normalizedBcc.length > 0 ? normalizedBcc : undefined,
      subject: normalizedSubject,
      react: React.createElement(AdminDirectUserMessageEmail, {
        userName,
        subject: normalizedSubject,
        message: normalizedMessage,
      }),
    })

    if (!result.success) {
      return {
        success: false,
        error: "Failed to send user email",
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in sendDirectUserEmail server action:", error)
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error occurred while sending user email",
    }
  }
}

/**
 * Server action to send ban notification email to a user
 * This must be called from the server side to avoid exposing email credentials
 */
export async function sendBanNotificationEmail(
  params: SendBanEmailParams
): Promise<EmailActionResult> {
  try {
    const { userName, userEmail, banType, banExpiresInDays, banReason } = params

    // Validate required parameters
    if (!userName || !userEmail || !banReason) {
      return {
        success: false,
        error: "Missing required parameters for sending ban email",
      }
    }

    // Send the email
    const result = await sendAccountBannedEmail(
      userName,
      userEmail,
      banType,
      banExpiresInDays,
      banReason
    )

    if (!result || !result.success) {
      return {
        success: false,
        error: "Failed to send ban notification email",
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in sendBanNotificationEmail server action:", error)
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error occurred while sending ban email",
    }
  }
}

/**
 * Server action to send unban notification email to a user
 * This must be called from the server side to avoid exposing email credentials
 */
export async function sendUnbanNotificationEmail(
  params: SendUnbanEmailParams
): Promise<EmailActionResult> {
  try {
    const { userName, userEmail, originalBanReason, wasPermanent } = params

    // Validate required parameters
    if (!userName || !userEmail) {
      return {
        success: false,
        error: "Missing required parameters for sending unban email",
      }
    }

    // Send the email
    const result = await sendAccountUnbannedEmail(
      userName,
      userEmail,
      originalBanReason,
      wasPermanent
    )

    if (!result || !result.success) {
      return {
        success: false,
        error: "Failed to send unban notification email",
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in sendUnbanNotificationEmail server action:", error)
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error occurred while sending unban email",
    }
  }
}

/**
 * Server action to send email notification when a banned user tries to login
 * This informs the user about the login attempt and their ban status
 */
export async function sendBannedUserLoginAttemptEmail(
  params: SendBannedUserLoginAttemptParams
): Promise<EmailActionResult> {
  try {
    const { user, ipAddress, userAgent, attemptTime, location } = params

    // Validate required parameters
    if (!user.name || !user.email) {
      return {
        success: false,
        error: "Missing required user parameters",
      }
    }

    // Send the email using the existing account suspended email function
    const result = await sendAccountSuspendedEmail(
      {
        name: user.name,
        email: user.email,
        banReason: user.banReason || "Policy violation",
      } as User,
      {
        ip: ipAddress,
        city: location?.city,
        country: location?.country,
        userAgent: userAgent,
      }
    )

    if (!result || !result.success) {
      return {
        success: false,
        error: "Failed to send banned user login attempt email",
      }
    }

    return { success: true }
  } catch (error) {
    console.error(
      "Error in sendBannedUserLoginAttemptEmail server action:",
      error
    )
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error occurred while sending login attempt email",
    }
  }
}
