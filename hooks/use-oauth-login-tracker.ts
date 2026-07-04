"use client"

import { useEffect, useRef } from "react"

import { sendLoginNotification, updateLastLogin } from "@/lib/auth-actions"
import { authClient } from "@/lib/auth-client"

/**
 * Hook to track OAuth logins and update last login timestamp
 * Should be used in pages that OAuth redirects to (login page, onboarding, etc.)
 */
export function useOAuthLoginTracker() {
  const { data: session } = authClient.useSession()
  const hasTracked = useRef(false)

  useEffect(() => {
    // Only run once per session
    if (hasTracked.current || !session?.user) {
      return
    }

    const trackLogin = async () => {
      try {
        // Check if this is an OAuth login by checking URL params
        const params = new URLSearchParams(window.location.search)
        const isOAuthCallback =
          params.has("state") || params.has("code") || params.has("oauth")

        // Also check if user just signed in (within last 10 seconds)
        const sessionCreatedAt = session.user.createdAt
          ? new Date(session.user.createdAt)
          : null
        const now = new Date()
        const isNewSession =
          sessionCreatedAt && now.getTime() - sessionCreatedAt.getTime() < 10000

        // If this looks like an OAuth callback or new session, update last login
        if (isOAuthCallback || isNewSession || true) {
          // Always update on page load if authenticated
          await updateLastLogin()
          // Send login notification email
          await sendLoginNotification()
          hasTracked.current = true
          console.log("Last login updated via OAuth tracker")
        }
      } catch (error) {
        console.error("Failed to track OAuth login:", error)
      }
    }

    trackLogin()
  }, [session])
}
