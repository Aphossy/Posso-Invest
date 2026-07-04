// hooks\use-logout.ts
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { authClient } from "@/lib/auth-client"
// import logger from "@/utils/logger"

import { apiService } from "@/lib/axios"

export function useLogout() {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false)
  const [isLoggingOutOther, setIsLoggingOutOther] = useState(false)
  const router = useRouter()

  const logout = async (): Promise<boolean> => {
    setIsLoggingOut(true)
    try {
      await authClient.signOut()

      // Clear auth state

      // Redirect to login page
      router.push("/login")

      return true
    } catch (error: any) {
      console.error("Logout error:", error)
      // logger.error("Logout error:", error)

      // Even if API call fails, clear local state and redirect
      await authClient.signOut()
      router.push("/login")

      return false
    } finally {
      setIsLoggingOut(false)
    }
  }

  const logoutAll = async (): Promise<{
    success: boolean
    sessionsTerminated?: number
  }> => {
    setIsLoggingOutAll(true)
    try {
      const response = await apiService.post<{ sessionsTerminated: number }>(
        "/authentication/logout-all"
      )

      // Redirect to login page
      router.push("/login")

      return {
        success: true,
        sessionsTerminated: response.sessionsTerminated,
      }
    } catch (error: any) {
      console.error("Logout all error:", error)
      // Even if API call fails, clear local state and redirect
      await authClient.revokeSessions()
      router.push("/login")

      return { success: false }
    } finally {
      setIsLoggingOutAll(false)
    }
  }

  const logoutOther = async (): Promise<{
    success: boolean
    sessionsTerminated?: number
  }> => {
    setIsLoggingOutOther(true)

    try {
      const response = await apiService.post<{ sessionsTerminated: number }>(
        "/authentication/logout-other"
      )

      return {
        success: true,
        sessionsTerminated: response.sessionsTerminated,
      }
    } catch (error: any) {
      console.error("Logout other error:", error)
      // Even if API call fails, clear local state and redirect
      await authClient.revokeOtherSessions()
      return { success: false }
    } finally {
      setIsLoggingOutOther(false)
    }
  }

  const terminateSession = async (sessionId: string): Promise<boolean> => {
    try {
      await apiService.delete(`/authentication/sessions/${sessionId}`)
      return true
    } catch (error: any) {
      console.error("Terminate session error:", error)
      // logger.error("Terminate session error:", error)
      return false
    }
  }

  return {
    logout,
    logoutAll,
    logoutOther,
    terminateSession,
    isLoggingOut,
    isLoggingOutAll,
    isLoggingOutOther,
  }
}
