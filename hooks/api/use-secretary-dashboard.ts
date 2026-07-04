import { useQuery } from "@tanstack/react-query"

import { ApiErrorException } from "@/types/api"
import { apiClient } from "@/lib/api-client"

export interface SecretaryDashboardData {
  secretary: {
    id: string
    name: string
    email: string
    role: string
  }
  stats: {
    meetings: {
      upcoming: number
      completed: number
      nextMeeting: string | null
      nextMeetingTitle: string | null
      nextMeetingLocation: string | null
    }
    minutes: {
      draft: number
      finalized: number
      published: number
      total: number
    }
    actionItems: {
      open: number
      inProgress: number
      blocked: number
      done: number
      dueSoon: number
    }
    attendance: {
      lastMeetingRate: number
      lastMeetingPresent: number
      lastMeetingTotal: number
      membershipCount: number
    }
    communications: {
      unreadMessages: number
      draftAnnouncements: number
      draftLetters: number
      sentLetters: number
    }
  }
  meetings: {
    upcoming: Array<{
      id: string
      title: string
      scheduledAt: string
      location: string | null
      status: string
      agenda: string | null
    }>
    recent: Array<{
      id: string
      title: string
      scheduledAt: string
      status: string
    }>
  }
  minutes: {
    recent: Array<{
      id: string
      meetingId: string
      status: string
      summary: string | null
      publishedAt: string | null
      updatedAt: string
    }>
  }
  actionItems: {
    open: Array<ActionItemEntry>
    inProgress: Array<ActionItemEntry>
    blocked: Array<ActionItemEntry>
    dueSoon: Array<ActionItemEntry>
    recentlyDone: Array<ActionItemEntry>
  }
  announcements: {
    drafts: Array<{
      id: string
      title: string
      audience: string
      updatedAt: string
    }>
    recentPublished: Array<{
      id: string
      title: string
      audience: string
      pinned: boolean
      publishedAt: string | null
    }>
  }
  letters: {
    recent: Array<{
      id: string
      subject: string
      letterType: string
      status: string
      recipient: string | null
      refNumber: string | null
      createdAt: string
    }>
  }
  messages: {
    recent: Array<{
      id: string
      subject: string
      name: string | null
      status: string
      isRead: boolean
      createdAt: string
    }>
    unreadCount: number
  }
}

export interface ActionItemEntry {
  id: string
  title: string
  status: string
  priority: string
  dueDate: string | null
  completedAt: string | null
  ownerName: string | null
  meetingId: string | null
}

export interface SecretaryDashboardResponse {
  success: true
  data: SecretaryDashboardData
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
      minutes: string
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

export function useSecretaryDashboard() {
  return useQuery<SecretaryDashboardResponse, ApiErrorException>({
    queryKey: ["dashboard", "secretary"],
    queryFn: async () => {
      try {
        const response = await apiClient.get<SecretaryDashboardResponse>(
          "/api/secretary-dashboard"
        )
        return response
      } catch (error) {
        if (error instanceof ApiErrorException) {
          throw error
        } else if (error instanceof Error) {
          throw new ApiErrorException(
            "UNKNOWN_ERROR",
            "An unexpected error occurred while fetching secretary dashboard data",
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
