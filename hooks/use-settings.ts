// hooks\use-settings.ts
"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { authClient } from "@/lib/auth-client"
import { apiService } from "@/lib/axios"

export interface UserSettings {
  email: string
  twoFactorEnabled: boolean
  emailNotifications: boolean
  smsNotifications: boolean
  securityEmails: boolean
  language: "en" | "rw" | "fr"
  theme: "light" | "dark" | "system"
  lastPasswordChange: string | null
  accountCreated: string
  lastLogin: string | null
  isVerified: boolean
}

interface ApiResponse<T> {
  success: boolean
  data: {
    message: string
    statusCode: number
    settings: T
    requiresVerification?: boolean
    startTime: number
  }
  error: any
  metadata: {
    requestId: string
    serverTimestamp: number
    processingTime: number
    serverTimeZone: string
    apiVersion: string
    requestMethod: string
    requestPath: string
    userAgent: string
    clientIp: string
    environment: string
    serverName: string
    responseTime: string
    links: {
      self: string
    }
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { data: session, isPending } = authClient.useSession()
  const user = session?.user || null
  const isAuthenticated = !!user

  // Refs to prevent infinite loops
  const hasFetchedRef = useRef(false)
  const isInitializedRef = useRef(false)
  const lastUserIdRef = useRef<string | null>(null)
  const isFetchingRef = useRef(false)

  const fetchSettings = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (isFetchingRef.current) return
    // Don't fetch if auth is still loading
    if (isPending) return
    // Don't fetch if not authenticated
    if (!isAuthenticated || !user) return
    // Skip if we've already fetched for this user and have data
    if (
      hasFetchedRef.current &&
      lastUserIdRef.current === user.id &&
      settings
    ) {
      return
    }
    // Skip if already loading
    if (loading) return

    isFetchingRef.current = true
    setLoading(true)
    setError(null)

    try {
      const response =
        await apiService.get<ApiResponse<UserSettings>>("/settings")

      if (response.success && response.data?.settings) {
        setSettings(response.data.settings)
        hasFetchedRef.current = true
        lastUserIdRef.current = user.id
        isInitializedRef.current = true
      } else {
        const errorMessage =
          response.error?.message ||
          response.data?.message ||
          "Failed to fetch settings"
        setError(errorMessage)
        console.error("Settings fetch error:", errorMessage)
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        "Failed to fetch settings"
      setError(errorMessage)
      console.error("Fetch settings error:", err)
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }, [isAuthenticated, user, isPending, settings, loading])

  const updateSettings = async (updates: {
    email?: string
    currentPassword?: string
    newPassword?: string
    twoFactorEnabled?: boolean
    emailNotifications?: boolean
    smsNotifications?: boolean
    securityEmails?: boolean
    language?: "en" | "rw" | "fr"
    theme?: "light" | "dark" | "system"
  }) => {
    if (!isAuthenticated || !user) {
      toast.error("Authentication required")
      return { success: false }
    }

    setError(null)

    // Create a promise for the toast
    const updatePromise = new Promise(async (resolve, reject) => {
      try {
        const response = await apiService.patch<ApiResponse<UserSettings>>(
          "/settings",
          updates
        )

        if (response.success && response.data) {
          // Update settings with the new data
          const updatedSettings = response.data.settings

          if (updatedSettings) {
            // Force refetch after successful update
            hasFetchedRef.current = false
            lastUserIdRef.current = user.id
            isInitializedRef.current = true
            setSettings(updatedSettings)

            // Update auth store with latest user data
            if (authClient.updateUser) {
              authClient.updateUser({
                ...user,
              })
            }

            resolve({
              success: true,
              message: response.data.message || "Settings updated successfully",
              data: updatedSettings,
              requiresVerification: response.data.requiresVerification,
            })
          } else {
            const errorMessage = "No settings data returned from server"
            setError(errorMessage)
            reject(new Error(errorMessage))
          }
        } else {
          const errorMessage =
            response.error?.message ||
            response.data?.message ||
            "Failed to update settings"
          setError(errorMessage)
          reject(new Error(errorMessage))
        }
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.error?.message ||
          err.response?.data?.data?.message ||
          err.response?.data?.message ||
          err.message ||
          "Failed to update settings"
        setError(errorMessage)
        console.error("Update settings error:", err)
        reject(new Error(errorMessage))
      }
    })

    // Use toast.promise for loading state
    const result = await toast.promise(updatePromise, {
      loading: "Updating settings...",
      success: (data: any) => data.message || "Settings updated successfully!",
      error: (err: Error) => err.message || "Failed to update settings",
    })

    return result
  }

  // Reset state when user changes or logs out
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setSettings(null)
      setError(null)
      hasFetchedRef.current = false
      isInitializedRef.current = false
      lastUserIdRef.current = null
      isFetchingRef.current = false
      return
    }

    // If user changed, reset and fetch new data
    if (lastUserIdRef.current && lastUserIdRef.current !== user.id) {
      setSettings(null)
      setError(null)
      hasFetchedRef.current = false
      isInitializedRef.current = false
      lastUserIdRef.current = null
      isFetchingRef.current = false
    }
  }, [isAuthenticated, user])

  // Initial fetch
  useEffect(() => {
    if (!isInitializedRef.current && isAuthenticated && user && !isPending) {
      fetchSettings()
    }
  }, [fetchSettings, isAuthenticated, user, isPending])

  return {
    settings,
    loading,
    error,
    updateSettings,
    refetch: fetchSettings,
  }
}
