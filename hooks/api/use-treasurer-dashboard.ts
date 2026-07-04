import { useQuery } from "@tanstack/react-query"

import { ApiErrorException } from "@/types/api"
import { apiClient } from "@/lib/api-client"
import type { FundPosition } from "@/lib/fund-position"

export interface TreasurerDashboardData {
  treasurer: {
    id: string
    name: string
    email: string
    role: string
  }
  stats: {
    contributions: {
      confirmedThisPeriodAmount: number
      expectedThisPeriod: number
      outstandingAmount: number
      collectionRate: number
      totalAllTimeAmount: number
      confirmedCount: number
      pendingCount: number
      lateCount: number
      waivedCount: number
      thisPeriodMembersPaid: number
      thisPeriodTotal: number
    }
    loans: {
      outstandingAmount: number
      pendingRequests: number
      approved: number
      disbursed: number
      repaying: number
      overdue: number
      repaid: number
      totalActive: number
    }
    penalties: {
      activeCount: number
      waivedCount: number
      totalActiveAmount: number
    }
    receipts: {
      issuedThisPeriod: number
      totalIssued: number
    }
    fundPosition: FundPosition
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
      confirmed: number
      total: number
      late: number
    }>
    outstandingMembers: Array<{
      memberId: string
      memberName: string
      amount: number
      status: string
      period: string
    }>
    recent: Array<{
      id: string
      memberId: string
      amount: number
      period: string
      status: string
      paidAt: string | null
      receiptNumber: string | null
    }>
  }
  loans: {
    monthly: Array<{
      month: string
      requested: number
      disbursed: number
    }>
    pendingRequests: Array<{
      id: string
      memberId: string
      requestedAmount: number
      requestedAt: string
      termMonths: number | null
    }>
    overdueLoans: Array<{
      id: string
      memberId: string
      memberName: string
      amount: number
      dueDate: string | null
      status: string
    }>
  }
  penalties: {
    recent: Array<{
      id: string
      memberId: string
      amount: number
      period: string
      reason: string | null
      createdAt: string
    }>
  }
  meetings: {
    upcoming: Array<{
      id: string
      title: string
      scheduledAt: string
      location: string | null
    }>
  }
  audit: {
    cadenceMonths: number
    nextAuditApprox: string
    daysToAudit: number
  }
}

export interface TreasurerDashboardResponse {
  success: true
  data: TreasurerDashboardData
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
      penalties: string
      receipts: string
    }
    rateLimit?: {
      limit: number
      remaining: number
      reset: string
    }
  }
}

export function useTreasurerDashboard() {
  return useQuery<TreasurerDashboardResponse, ApiErrorException>({
    queryKey: ["dashboard", "treasurer"],
    queryFn: async () => {
      try {
        const response = await apiClient.get<TreasurerDashboardResponse>(
          "/api/treasurer-dashboard"
        )
        return response
      } catch (error) {
        if (error instanceof ApiErrorException) {
          throw error
        } else if (error instanceof Error) {
          throw new ApiErrorException(
            "UNKNOWN_ERROR",
            "An unexpected error occurred while fetching treasurer dashboard data",
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
