import { useQuery } from "@tanstack/react-query"

import { ApiErrorException } from "@/types/api"
import { apiClient } from "@/lib/api-client"
import type { FundPosition } from "@/lib/fund-position"

export interface PresidentDashboardData {
  president: {
    id: string
    name: string
    email: string
    role: string
  }
  stats: {
    nextMeeting: {
      title: string
      scheduledAt: string
      location: string | null
    } | null
    openActionItems: number
    pendingLoanRequests: number
    overdueLoans: number
    activePenalties: number
    totalMembers: number
    activeMemberCount: number
    finance: {
      totalSavings: number
      activeLoanAmount: number
      penaltyFundAmount: number
      collectionRate: number
      confirmedThisPeriodAmount: number
      expectedThisPeriod: number
      fundPosition: FundPosition
    }
  }
  leadership: {
    termStart: string
    termEnd: string
    daysRemaining: number
    leadershipTermMonths: number
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
    open: Array<{
      id: string
      title: string
      status: string
      priority: string
      dueDate: string | null
      assigneeId: string | null
    }>
    urgent: Array<{
      id: string
      title: string
      status: string
      priority: string
      dueDate: string | null
    }>
  }
  announcements: {
    recent: Array<{
      id: string
      title: string
      status: string
      publishedAt: string | null
      audience: string | null
    }>
  }
  pendingAuthorizations: Array<{
    id: string
    memberId: string
    memberName: string
    requestedAmount: number
    requestedAt: string
    termMonths: number | null
  }>
  contributions: {
    monthly: Array<{
      month: string
      confirmed: number
      period: string
      total: number
      late: number
    }>
  }
}

export interface PresidentDashboardResponse {
  success: true
  data: PresidentDashboardData
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
      meetings: string
      loans: string
      actionItems: string
    }
    rateLimit?: {
      limit: number
      remaining: number
      reset: string
    }
  }
}

export function usePresidentDashboard() {
  return useQuery<PresidentDashboardResponse, ApiErrorException>({
    queryKey: ["dashboard", "president"],
    queryFn: async () => {
      try {
        const response = await apiClient.get<PresidentDashboardResponse>(
          "/api/president-dashboard"
        )
        return response
      } catch (error) {
        if (error instanceof ApiErrorException) {
          throw error
        } else if (error instanceof Error) {
          throw new ApiErrorException(
            "UNKNOWN_ERROR",
            "An unexpected error occurred while fetching president dashboard data",
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
