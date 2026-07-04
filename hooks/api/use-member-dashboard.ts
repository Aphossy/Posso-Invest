import { useQuery } from "@tanstack/react-query"

import { ApiErrorException } from "@/types/api"
import { apiClient } from "@/lib/api-client"

export interface MemberDashboardData {
  member: {
    id: string
    name: string
    email: string
    role: string
  }
  stats: {
    savings: {
      totalSaved: number
      thisPeriodAmount: number
      thisPeriodStatus: "pending" | "confirmed" | "late" | "waived" | null
      confirmedCount: number
      pendingCount: number
      lateCount: number
      waivedCount: number
      streak: number
    }
    loans: {
      total: number
      pendingRequests: number
      activeLoan: {
        id: string
        amount: number
        status: string
        dueDate: string | null
        termMonths: number | null
        interestRate: number
      } | null
      isOverdue: boolean
      byStatus: Record<string, number>
    }
    attendance: {
      rate: number
      present: number
      total: number
      absent: number
      excused: number
    }
    penalties: {
      activeCount: number
      totalAmount: number
    }
  }
  window: {
    isOpen: boolean
    label: string
    period: string
    daysRemaining: number
    daysUntilNext: number
  }
  contributions: {
    monthly: Array<{
      month: string
      period: string
      amount: number
      status: string | null
    }>
    recent: Array<{
      id: string
      amount: number
      period: string
      status: string
      paidAt: string | null
      receiptNumber: string | null
    }>
  }
  loans: {
    recent: Array<{
      id: string
      requestedAmount: number
      approvedAmount: number | null
      status: string
      requestedAt: string
      disbursedAt: string | null
      dueDate: string | null
      termMonths: number | null
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
    recentAttendance: Array<{
      id: string
      meetingId: string
      status: string
      checkedInAt: string | null
      createdAt: string
    }>
  }
  announcements: {
    recent: Array<{
      id: string
      title: string
      summary: string | null
      pinned: boolean
      publishedAt: string | null
    }>
  }
  penalties: {
    active: Array<{
      id: string
      amount: number
      period: string
      reason: string | null
      createdAt: string
    }>
  }
}

export interface MemberDashboardResponse {
  success: true
  data: MemberDashboardData
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
    }
    rateLimit?: {
      limit: number
      remaining: number
      reset: string
    }
  }
}

export function useMemberDashboard() {
  return useQuery<MemberDashboardResponse, ApiErrorException>({
    queryKey: ["dashboard", "member"],
    queryFn: async () => {
      try {
        const response = await apiClient.get<MemberDashboardResponse>(
          "/api/member-dashboard"
        )
        return response
      } catch (error) {
        if (error instanceof ApiErrorException) {
          throw error
        } else if (error instanceof Error) {
          throw new ApiErrorException(
            "UNKNOWN_ERROR",
            "An unexpected error occurred while fetching member dashboard data",
            { originalError: error.message },
            "Please try again later or contact support."
          )
        }
        throw error
      }
    },
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
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
