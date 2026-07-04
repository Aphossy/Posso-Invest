"use server"

import { headers } from "next/headers"
import { sendWelcomeEmail } from "@/utils/auth-notification-utils"

import { auth } from "@/lib/auth"

interface OnboardingData {
  phone?: string
  acceptedTerms: boolean
  preferences?: {
    notifications?: {
      email?: boolean
      sms?: boolean
      security?: boolean
    }
  }
}

interface OnboardingResult {
  success: boolean
  error?: string
  redirectUrl?: string
}

/**
 * Complete user onboarding process
 * Saves user preferences and sends welcome email
 */
export async function completeOnboarding(
  data: OnboardingData
): Promise<OnboardingResult> {
  try {
    // Get current session
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return {
        success: false,
        error: "Not authenticated. Please sign in again.",
      }
    }

    // Validate terms acceptance
    if (!data.acceptedTerms) {
      return {
        success: false,
        error: "You must accept the terms and conditions to continue.",
      }
    }

    // Update user with onboarding data
    // Note: Better Auth may not have direct user update methods
    // You might need to use your database directly
    const { db } = await import("@/db")
    const { user: userTable } = await import("@/db/schemas")
    const { eq } = await import("drizzle-orm")

    const updateData: any = {
      updatedAt: new Date(),
    }

    if (data.phone) {
      updateData.phone = data.phone
    }

    if (data.preferences) {
      updateData.preferences = data.preferences
    }

    // Mark onboarding as completed in metadata
    updateData.metadata = {
      ...((session.user as any).metadata || {}),
      onboardingCompleted: true,
      onboardingCompletedAt: new Date().toISOString(),
    }

    await db
      .update(userTable)
      .set(updateData)
      .where(eq(userTable.id, session.user.id))

    // Send welcome email
    try {
      await sendWelcomeEmail(session.user.email, session.user.name || "User")
      console.log(`Welcome email sent to ${session.user.email}`)
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError)
      // Don't fail onboarding if email fails
    }

    // Determine redirect URL based on role
    const userRole = (session.user as any).role || "member"
    const roleRedirects: Record<string, string> = {
      admin: "/admin/dashboard",
      president: "/president/dashboard",
      treasurer: "/treasurer/dashboard",
      secretary: "/secretary/dashboard",
      member: "/member/dashboard",
    }

    return {
      success: true,
      redirectUrl: roleRedirects[userRole] || "/member/dashboard",
    }
  } catch (error) {
    console.error("Onboarding completion error:", error)
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred during onboarding",
    }
  }
}
