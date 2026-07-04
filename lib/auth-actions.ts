"use server"

import { headers } from "next/headers"
import { db } from "@/db"
import { user as userTable } from "@/db/schemas"
// import { sendLoginNotificationEmail } from "@/utils/auth-notification-utils"
import { APIError } from "better-auth"
import { eq } from "drizzle-orm"

import { auth } from "@/lib/auth"
import { setPasswordFormSchema } from "@/lib/validators/auth-validators"

interface AuthActionResult {
  success: boolean
  error?: string
}

interface UpdateUserProfileData {
  userId: string
  name?: string
  phone?: string
  email?: string
  metadata?: Record<string, any>
}

/**
 * Server action to set a password for the current user
 * Used when a user signs up with OAuth and wants to add password authentication
 */
export async function setPasswordAction(
  password: string
): Promise<AuthActionResult> {
  try {
    // Validate password
    const validatedData = setPasswordFormSchema.safeParse({ password })
    if (!validatedData.success) {
      const firstError = validatedData.error.issues[0]
      return {
        success: false,
        error: firstError.message || "Password validation failed",
      }
    }

    // Check session (ensures user is authenticated)
    const session = await auth.api.getSession({
      headers: await headers(),
    })
    if (!session) {
      return {
        success: false,
        error: "Unauthorized. Please sign in first.",
      }
    }

    // Use Better Auth's built-in setPassword
    const response = await auth.api.setPassword({
      body: { newPassword: password },
      headers: await headers(),
    })

    if (!response) {
      return {
        success: false,
        error: "Failed to set password",
      }
    }

    return { success: true }
  } catch (error) {
    if (error instanceof APIError) {
      console.error("Better Auth API Error:", error.message, error.status)
      return {
        success: false,
        error: error.message || "Failed to set password",
      }
    }
    console.error("Unexpected error in setPasswordAction:", error)
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while setting password",
    }
  }
}

/**
 * Server action to update user's last login timestamp
 * Called after successful authentication
 */
export async function updateLastLogin(): Promise<AuthActionResult> {
  try {
    // Get current session
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return {
        success: false,
        error: "Not authenticated",
      }
    }

    // Update last login timestamp
    await db
      .update(userTable)
      .set({
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userTable.id, session.user.id))

    return { success: true }
  } catch (error) {
    console.error("Update last login error:", error)
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update last login",
    }
  }
}

/**
 * Server action to send login notification email
 * Called after successful authentication
 */
export async function sendLoginNotification(): Promise<AuthActionResult> {
  try {
    // Get current session
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return {
        success: false,
        error: "Not authenticated",
      }
    }

    // Get request headers for location/device info
    const headersList = await headers()
    const userAgent = headersList.get("user-agent") || "Unknown"
    const ipAddress =
      headersList.get("x-forwarded-for")?.split(",")[0].trim() ||
      headersList.get("x-real-ip") ||
      "Unknown"

    // Send login notification email
    // await sendLoginNotificationEmail(
    //   {
    //     name: session.user.name,
    //     email: session.user.email,
    //   },
    //   {
    //     ip: ipAddress,
    //     userAgent: userAgent,
    //     city: undefined, // Can integrate IP geolocation API if needed
    //     country: undefined,
    //   }
    // )

    return { success: true }
  } catch (error) {
    console.error("Send login notification error:", error)
    // Don't fail the login if email sending fails
    return {
      success: true, // Return success even if email fails
      error:
        error instanceof Error
          ? error.message
          : "Failed to send login notification",
    }
  }
}

/**
 * Server action to update user profile data
 * Used during signup or profile updates
 */
export async function updateUserProfile(
  data: UpdateUserProfileData
): Promise<AuthActionResult> {
  try {
    const updateData: any = {
      updatedAt: new Date(),
    }

    if (data.name) {
      updateData.name = data.name
    }

    if (data.phone) {
      updateData.phone = data.phone
    }

    if (data.email) {
      updateData.email = data.email
    }

    if (data.metadata) {
      // Fetch current metadata first
      const [currentUser] = await db
        .select()
        .from(userTable)
        .where(eq(userTable.id, data.userId))
        .limit(1)

      updateData.metadata = {
        ...((currentUser?.metadata as Record<string, any>) || {}),
        ...data.metadata,
      }
    }

    await db
      .update(userTable)
      .set(updateData)
      .where(eq(userTable.id, data.userId))

    return { success: true }
  } catch (error) {
    console.error("Update user profile error:", error)
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update user profile",
    }
  }
}
