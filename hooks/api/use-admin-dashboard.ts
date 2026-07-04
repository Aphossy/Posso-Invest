import { useQuery } from "@tanstack/react-query"

import { ApiErrorException } from "@/types/api"
import { apiClient } from "@/lib/api-client"

export interface AdminDashboardData {
  stats: {
    contributions: {
      totalAmount: number
      thisMonthAmount: number
      expectedThisMonth: number
      outstandingAmount: number
      confirmedCount: number
      pendingCount: number
      lateCount: number
      waivedCount: number
      collectionRate: number
    }
    loans: {
      total: number
      outstandingAmount: number
      requested: number
      approved: number
      disbursed: number
      repaying: number
      overdue: number
      repaid: number
    }
    members: {
      total: number
      active: number
      invitationsPending: number
      byRole: Record<string, number>
    }
    meetings: {
      upcoming: number
      completed: number
      nextMeeting: string | null
    }
    attendance: {
      latestMeetingRate: number
      present: number
      absent: number
      late: number
      excused: number
    }
    actionItems: {
      open: number
      inProgress: number
      blocked: number
      dueSoon: number
    }
    announcements: {
      published: number
      draft: number
      pinned: number
    }
    messages: {
      unread: number
    }
    activity: Array<{
      id: string
      type: "contribution" | "loan" | "meeting" | "announcement" | "action-item"
      title: string
      description: string
      timestamp: string
      status?: string
    }>
  }
  window: {
    isOpen: boolean
    label: string
    period: string
    daysRemaining: number
    daysUntilNext: number
  }
  contributions: {
    byStatus: Record<string, number>
    monthly: Array<{
      month: string
      period: string
      total: number
      confirmed: number
      late: number
    }>
  }
  loans: {
    byStatus: Record<string, number>
    monthly: Array<{
      month: string
      requested: number
      disbursed: number
    }>
  }
  meetings: {
    upcoming: Array<{
      id: string
      title: string
      scheduledAt: string
      location: string | null
      status: string
    }>
  }
  actionItems: {
    urgent: Array<{
      id: string
      title: string
      dueDate: string | null
      status: string
      priority: string
      ownerName?: string | null
    }>
  }
  announcements: {
    recent: Array<{
      id: string
      title: string
      status: string
      audience: string
      publishedAt: string | null
    }>
  }
  messages: {
    recent: Array<{
      id: string
      subject: string
      status: string
      createdAt: string
      name: string | null
    }>
  }
  health: {
    status: "healthy" | "unhealthy"
    latency?: number
    error?: string
    timestamp: string
    connectionInfo: {
      isConnected: boolean
      maxConnections: number
    }
  }
}

export interface AdminDashboardResponse {
  success: true
  data: AdminDashboardData
  message: string
  error: null
  metadata: {
    requestId: string
    serverTimestamp: string
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
      contributions: string
      loans: string
      meetings: string
      actionItems: string
      announcements: string
    }
    rateLimit?: {
      limit: number
      remaining: number
      reset: string
    }
  }
}

export function useAdminDashboard() {
  return useQuery<AdminDashboardResponse, ApiErrorException>({
    queryKey: ["dashboard", "admin"],
    queryFn: async () => {
      try {
        const response =
          await apiClient.get<AdminDashboardResponse>("/api/dashboard")
        return response
      } catch (error) {
        if (error instanceof ApiErrorException) {
          throw error
        } else if (error instanceof Error) {
          throw new ApiErrorException(
            "UNKNOWN_ERROR",
            "An unexpected error occurred while fetching admin dashboard data",
            { originalError: error.message },
            "Please try again later or contact support."
          )
        }
        throw error
      }
    },
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      if (
        error instanceof ApiErrorException &&
        ["VALIDATION_ERROR", "UNAUTHORIZED"].includes(error.code)
      ) {
        return false
      }
      return failureCount < 3
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
  })
}
