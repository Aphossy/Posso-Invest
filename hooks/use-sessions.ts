// hooks/use-sessions.ts
"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import axios from "axios"

export interface SessionInfo {
  id: string
  isCurrent: boolean
  isValid?: boolean
  deviceInfo?: {
    browser?: string
    os?: string
    device?: string
    isMobile?: boolean
  }
  location?: {
    city?: string
    country?: string
    region?: string
    timezone?: string
  }
  ipAddress?: string
  userAgent?: string
  lastAccessedAt: string // Changed to string to match API response
  createdAt: string // Changed to string to match API response
  expires: string // Changed to string to match API response
  lastAction?: string
  lastActionAt?: string // Changed to string to match API response
  user?: {
    twoFactorEnabled?: boolean
  }
}

export function useSessions(page = 1, pageSize = 10) {
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ["sessions", page, pageSize],
    queryFn: async () => {
      const response = await axios.get("/api/authentication/sessions", {
        params: { page, pageSize },
      })

      console.log("Sessions API response:", response)
      // Map API response to SessionInfo and convert date strings if needed
      const sessions = response.data.data.sessions.map((session: any) => ({
        ...session,
        lastAccessedAt: session.lastAccessedAt, // Keep as string or convert to Date if needed
        createdAt: session.createdAt,
        expires: session.expiresAt,
        lastActionAt: session.lastActionAt || undefined,
      }))
      return {
        sessions: sessions as SessionInfo[],
        totalPages: response.data.metadata.pagination.totalPages,
      }
    },
    // Optional: Add staleTime or cacheTime for better performance
    staleTime: 60 * 1000, // Cache for 1 minute
  })

  const terminateSession = useMutation({
    mutationFn: async (sessionId: string) => {
      await axios.delete(`/api/authentication/sessions/${sessionId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] })
    },
    onError: (error: any) => {
      console.error(
        "Terminate session error:",
        error?.response?.data?.message || error.message
      )
    },
  })

  const refreshSessions = () => {
    queryClient.invalidateQueries({ queryKey: ["sessions"] })
  }

  return {
    sessions: data?.sessions || [],
    totalPages: data?.totalPages || 1,
    isLoading,
    error: error?.message || null,
    terminateSession: terminateSession.mutateAsync,
    refreshSessions,
  }
}
