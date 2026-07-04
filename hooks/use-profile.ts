// hooks\use-profile.ts
"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { type User } from "@/db/schemas"
import { toast } from "sonner"

import { authClient } from "@/lib/auth-client"
import { apiService } from "@/lib/axios"

interface UseProfileReturn {
  profile: User | null
  loading: boolean
  error: string | null
  updateProfile: (updates: Partial<User>) => Promise<User>
  refetch: () => Promise<void>
  isUpdating: boolean
}

export function useProfile(): UseProfileReturn {
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const {
    data: session,
    isPending,
    error: sessionError,
  } = authClient.useSession()
  const user = session?.user || null
  const isAuthenticated = !!user

  // Use refs to track if we've already fetched and prevent infinite loops
  const hasFetchedRef = useRef(false)
  const isInitializedRef = useRef(false)
  const lastUserIdRef = useRef<string | null>(null)
  const isFetchingRef = useRef(false)

  const fetchProfile = useCallback(async () => {
    // Don't fetch if not authenticated or still checking session
    if (isPending || !isAuthenticated || !user) {
      setProfile(null)
      hasFetchedRef.current = false
      setLoading(false)
      return
    }

    // Prevent multiple simultaneous calls
    if (isFetchingRef.current) {
      return
    }

    // Check if we already have the profile for this user
    if (hasFetchedRef.current && lastUserIdRef.current === user.id && profile) {
      return
    }

    isFetchingRef.current = true
    setLoading(true)
    setError(null)

    try {
      const response = await apiService.get<{
        success: boolean
        data: { user: User }
        message?: string
        error?: any
      }>("/profile")

      if (response.success && response.data) {
        setProfile(response.data.user)
        // Update auth store with latest user data if available
        if (authClient.updateUser) {
          authClient.updateUser(response.data.user)
        }
        hasFetchedRef.current = true
        lastUserIdRef.current = user.id
        setError(null)
      } else {
        const errorMessage =
          response.error?.message ||
          response.message ||
          "Failed to fetch profile"
        setError(errorMessage)
        console.error("Profile fetch error:", errorMessage)
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        "Failed to fetch profile"
      setError(errorMessage)
      console.error("Fetch profile error:", err)
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }, [isPending, isAuthenticated, user, profile])

  const updateProfile = async (updates: Partial<User>): Promise<User> => {
    if (!isAuthenticated || !user) {
      toast.error("Authentication required")
      return Promise.reject("Authentication required")
    }

    if (!profile) {
      toast.error("Profile not loaded")
      return Promise.reject("Profile not loaded")
    }

    // Store original profile for rollback
    const originalProfile = { ...profile }

    // Optimistically update the UI
    setProfile((prev) => (prev ? { ...prev, ...updates } : null))
    setError(null)
    setIsUpdating(true)

    try {
      const response = await apiService.patch<{
        success: boolean
        data: { user: User }
        message?: string
        error?: any
      }>("/profile", updates)

      if (response.success && response.data) {
        const updatedProfile = response.data.user
        setProfile(updatedProfile)

        // Update auth store with latest user data if available
        if (authClient.updateUser) {
          authClient.updateUser(updatedProfile)
        }

        toast.success(response.message || "Profile updated successfully")
        return updatedProfile
      } else {
        // Rollback on error
        setProfile(originalProfile)
        const errorMessage =
          response.error?.message ||
          response.message ||
          "Failed to update profile"
        throw new Error(errorMessage)
      }
    } catch (err: any) {
      // Rollback on error
      setProfile(originalProfile)

      const errorMessage =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        "Failed to update profile"
      setError(errorMessage)
      toast.error(errorMessage)
      console.error("Update profile error:", err)
      throw new Error(errorMessage)
    } finally {
      setIsUpdating(false)
    }
  }

  const refetch = useCallback(async () => {
    hasFetchedRef.current = false
    isFetchingRef.current = false
    await fetchProfile()
  }, [fetchProfile])

  // Initialize profile data only once when user changes
  useEffect(() => {
    if (!isInitializedRef.current && isAuthenticated && user && !isPending) {
      isInitializedRef.current = true
      fetchProfile()
    } else if (!isAuthenticated || !user) {
      // Reset when user logs out
      setProfile(null)
      setError(null)
      hasFetchedRef.current = false
      isInitializedRef.current = false
      lastUserIdRef.current = null
      isFetchingRef.current = false
      setLoading(false)
    } else if (user && lastUserIdRef.current !== user.id) {
      // User changed, fetch new profile
      hasFetchedRef.current = false
      isFetchingRef.current = false
      fetchProfile()
    }
  }, [user, isAuthenticated, isPending, fetchProfile])

  return {
    profile,
    loading,
    error,
    updateProfile,
    refetch,
    isUpdating,
  }
}
