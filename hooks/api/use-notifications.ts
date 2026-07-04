// hooks\api\use-notifications.ts
import type { Notification as NotificationSchema } from "@/db/schemas/notification-schema"
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { ApiErrorException } from "@/types/api"
import { apiClient } from "@/lib/api-client"

// Response types
export interface NotificationResponse {
  success: true
  data: {
    notification: NotificationSchema
    meta: {
      type: string
    }
  }
  message: string
  error: null
  metadata: any
}

export interface NotificationsListResponse {
  success: true
  data: {
    notifications: NotificationSchema[]
    unreadCount: number
    meta: {
      type: string
      count: number
      unreadOnly?: boolean
      includeArchived?: boolean
      archivedOnly?: boolean
    }
  }
  message: string
  error: null
  metadata: any
}

export interface MarkAllAsReadResponse {
  success: true
  data: {
    updatedCount: number
    meta: {
      type: string
    }
  }
  message: string
  error: null
  metadata: any
}

export interface DeleteResponse {
  success: true
  data: {
    deletedCount?: number
    meta: {
      type: string
      id?: string
    }
  }
  message: string
  error: null
  metadata: any
}

export interface UseNotificationsParams {
  limit?: number
  unreadOnly?: boolean
  includeArchived?: boolean
  archivedOnly?: boolean
  enabled?: boolean
}

// Fetch notifications with infinite scroll support
export function useInfiniteNotifications(
  params: UseNotificationsParams = { limit: 20 }
) {
  return useInfiniteQuery<NotificationsListResponse, ApiErrorException>({
    queryKey: ["notifications", "infinite", params],
    queryFn: async ({ pageParam = 0 }) => {
      try {
        const response = await apiClient.get<NotificationsListResponse>(
          "/api/notification",
          {
            limit: params.limit || 20,
            offset: pageParam,
            unreadOnly: params.unreadOnly,
            includeArchived: params.includeArchived,
            archivedOnly: params.archivedOnly,
          }
        )
        return response
      } catch (error) {
        if (error instanceof ApiErrorException) {
          throw error
        } else if (error instanceof Error) {
          throw new ApiErrorException(
            "UNKNOWN_ERROR",
            "An unexpected error occurred while fetching notifications",
            { originalError: error.message },
            "Please try again later or contact support."
          )
        }
        throw error
      }
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages, lastPageParam) => {
      const loadedCount = allPages.reduce(
        (acc, page) => acc + page.data.notifications.length,
        0
      )
      // If we got less than the limit, there are no more pages
      if (lastPage.data.notifications.length < (params.limit || 20)) {
        return undefined
      }
      return loadedCount
    },
    staleTime: 30 * 1000, // 30 seconds
    enabled: params.enabled !== false,
  })
}

// Fetch notifications (simple version for quick access)
export function useNotifications(params: UseNotificationsParams = {}) {
  return useQuery<NotificationsListResponse, ApiErrorException>({
    queryKey: ["notifications", params],
    queryFn: async () => {
      try {
        const response = await apiClient.get<NotificationsListResponse>(
          "/api/notification",
          {
            limit: params.limit || 20,
            unreadOnly: params.unreadOnly,
            includeArchived: params.includeArchived,
            archivedOnly: params.archivedOnly,
          }
        )
        return response
      } catch (error) {
        if (error instanceof ApiErrorException) {
          throw error
        } else if (error instanceof Error) {
          throw new ApiErrorException(
            "UNKNOWN_ERROR",
            "An unexpected error occurred while fetching notifications",
            { originalError: error.message },
            "Please try again later or contact support."
          )
        }
        throw error
      }
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute for new notifications
    enabled: params.enabled !== false,
  })
}

// Get unread count with enhanced error handling and retry logic
export function useUnreadNotificationsCount() {
  return useQuery<number, ApiErrorException>({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const response = await apiClient.get<NotificationsListResponse>(
        "/api/notification",
        {
          limit: 1,
          unreadOnly: true,
        }
      )
      // Ensure we always return a number, never undefined
      return response.data.unreadCount ?? 0
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
    retry: 3, // Retry failed requests 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    placeholderData: 0, // Show 0 while loading
    // Return 0 on error to avoid breaking the UI
    throwOnError: false,
  })
}

// Utility: Update unread count in cache
function updateUnreadCountInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  delta: number
) {
  queryClient.setQueryData<number>(
    ["notifications", "unread-count"],
    (old = 0) => Math.max(0, old + delta)
  )
}

export function useNotificationOperations() {
  const queryClient = useQueryClient()

  // Get single notification
  const useGetNotification = (notificationId: string) =>
    useQuery<NotificationResponse, ApiErrorException>({
      queryKey: ["notification", notificationId],
      queryFn: async () => {
        try {
          const response = await apiClient.get<NotificationResponse>(
            `/api/notification/${notificationId}`
          )
          return response
        } catch (error) {
          if (error instanceof ApiErrorException) {
            throw error
          } else if (error instanceof Error) {
            throw new ApiErrorException(
              "UNKNOWN_ERROR",
              "An unexpected error occurred while fetching notification",
              { originalError: error.message },
              "Please try again later or contact support."
            )
          }
          throw error
        }
      },
      enabled: !!notificationId,
    })

  // Mark single notification as read
  const markAsRead = useMutation<
    NotificationResponse,
    ApiErrorException,
    string,
    { previousNotifications: any; previousInfiniteNotifications: any }
  >({
    mutationFn: async (notificationId) => {
      try {
        const response = await apiClient.patch<NotificationResponse>(
          `/api/notification/${notificationId}`,
          { action: "mark_read" }
        )
        return response
      } catch (error) {
        if (error instanceof ApiErrorException) {
          throw error
        } else if (error instanceof Error) {
          throw new ApiErrorException(
            "UNKNOWN_ERROR",
            "An unexpected error occurred while marking notification as read",
            { originalError: error.message },
            "Please try again later or contact support."
          )
        }
        throw error
      }
    },
    onMutate: async (notificationId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["notifications"] })

      // Snapshot previous value
      const previousNotifications = queryClient.getQueryData([
        "notifications",
        {},
      ])
      const previousInfiniteNotifications = queryClient.getQueryData([
        "notifications",
        "infinite",
      ])

      // Optimistically update
      queryClient.setQueriesData<NotificationsListResponse>(
        { queryKey: ["notifications"] },
        (old) => {
          if (!old || !old.data || !old.data.notifications) return old
          return {
            ...old,
            data: {
              ...old.data,
              notifications: old.data.notifications.map((n) =>
                n.id === notificationId
                  ? { ...n, isRead: true, readAt: new Date() }
                  : n
              ),
              unreadCount: Math.max(0, old.data.unreadCount - 1),
            },
          }
        }
      )

      // Update infinite query data
      queryClient.setQueriesData(
        { queryKey: ["notifications", "infinite"] },
        (old: any) => {
          if (!old || !old.pages) return old
          return {
            ...old,
            pages: old.pages.map((page: NotificationsListResponse) => {
              // Check if page and page.data exist
              if (!page || !page.data || !page.data.notifications) return page
              return {
                ...page,
                data: {
                  ...page.data,
                  notifications: page.data.notifications.map(
                    (n: NotificationSchema) =>
                      n.id === notificationId
                        ? { ...n, isRead: true, readAt: new Date() }
                        : n
                  ),
                  unreadCount: Math.max(0, page.data.unreadCount - 1),
                },
              }
            }),
          }
        }
      )

      return { previousNotifications, previousInfiniteNotifications }
    },
    onError: (err, notificationId, context) => {
      // Rollback on error
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          ["notifications", {}],
          context.previousNotifications
        )
      }
      if (context?.previousInfiniteNotifications) {
        queryClient.setQueryData(
          ["notifications", "infinite"],
          context.previousInfiniteNotifications
        )
      }
    },
    onSuccess: () => {
      // Update unread count immediately
      updateUnreadCountInCache(queryClient, -1)
      // Then invalidate to get fresh data
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })

  const archiveNotification = useMutation<
    NotificationResponse,
    ApiErrorException,
    string
  >({
    mutationFn: async (notificationId) => {
      try {
        const response = await apiClient.patch<NotificationResponse>(
          `/api/notification/${notificationId}`,
          { action: "archive" }
        )
        return response
      } catch (error) {
        if (error instanceof ApiErrorException) {
          throw error
        } else if (error instanceof Error) {
          throw new ApiErrorException(
            "UNKNOWN_ERROR",
            "An unexpected error occurred while archiving notification",
            { originalError: error.message },
            "Please try again later or contact support."
          )
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
      queryClient.invalidateQueries({
        queryKey: ["notifications", "unread-count"],
      })
    },
  })

  const unarchiveNotification = useMutation<
    NotificationResponse,
    ApiErrorException,
    string
  >({
    mutationFn: async (notificationId) => {
      try {
        const response = await apiClient.patch<NotificationResponse>(
          `/api/notification/${notificationId}`,
          { action: "unarchive" }
        )
        return response
      } catch (error) {
        if (error instanceof ApiErrorException) {
          throw error
        } else if (error instanceof Error) {
          throw new ApiErrorException(
            "UNKNOWN_ERROR",
            "An unexpected error occurred while unarchiving notification",
            { originalError: error.message },
            "Please try again later or contact support."
          )
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
      queryClient.invalidateQueries({
        queryKey: ["notifications", "unread-count"],
      })
    },
  })

  // Mark all as read
  const markAllAsRead = useMutation<
    MarkAllAsReadResponse,
    ApiErrorException,
    void
  >({
    mutationFn: async () => {
      try {
        const response = await apiClient.patch<MarkAllAsReadResponse>(
          "/api/notification",
          {}
        )
        return response
      } catch (error) {
        if (error instanceof ApiErrorException) {
          throw error
        } else if (error instanceof Error) {
          throw new ApiErrorException(
            "UNKNOWN_ERROR",
            "An unexpected error occurred while marking all notifications as read",
            { originalError: error.message },
            "Please try again later or contact support."
          )
        }
        throw error
      }
    },
    onSuccess: (data) => {
      // Set unread count to 0 immediately
      queryClient.setQueryData<number>(["notifications", "unread-count"], 0)
      // Then invalidate to get fresh data
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })

  // Delete single notification
  const deleteNotification = useMutation<
    DeleteResponse,
    ApiErrorException,
    string,
    { previousNotifications: any; previousInfiniteNotifications: any }
  >({
    mutationFn: async (notificationId) => {
      try {
        const response = await apiClient.delete<DeleteResponse>(
          `/api/notification/${notificationId}`
        )
        return response
      } catch (error) {
        if (error instanceof ApiErrorException) {
          throw error
        } else if (error instanceof Error) {
          throw new ApiErrorException(
            "UNKNOWN_ERROR",
            "An unexpected error occurred while deleting notification",
            { originalError: error.message },
            "Please try again later or contact support."
          )
        }
        throw error
      }
    },
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] })

      const previousNotifications = queryClient.getQueryData([
        "notifications",
        {},
      ])
      const previousInfiniteNotifications = queryClient.getQueryData([
        "notifications",
        "infinite",
      ])

      // Optimistically remove notification
      queryClient.setQueriesData<NotificationsListResponse>(
        { queryKey: ["notifications"] },
        (old) => {
          if (!old || !old.data || !old.data.notifications) return old
          const notification = old.data.notifications.find(
            (n) => n.id === notificationId
          )
          return {
            ...old,
            data: {
              ...old.data,
              notifications: old.data.notifications.filter(
                (n) => n.id !== notificationId
              ),
              unreadCount:
                notification && !notification.isRead
                  ? Math.max(0, old.data.unreadCount - 1)
                  : old.data.unreadCount,
            },
          }
        }
      )

      // Update infinite query
      queryClient.setQueriesData(
        { queryKey: ["notifications", "infinite"] },
        (old: any) => {
          if (!old || !old.pages) return old
          return {
            ...old,
            pages: old.pages.map((page: NotificationsListResponse) => {
              // Check if page and page.data exist
              if (!page || !page.data || !page.data.notifications) return page
              const notification = page.data.notifications.find(
                (n) => n.id === notificationId
              )
              return {
                ...page,
                data: {
                  ...page.data,
                  notifications: page.data.notifications.filter(
                    (n: NotificationSchema) => n.id !== notificationId
                  ),
                  unreadCount:
                    notification && !notification.isRead
                      ? Math.max(0, page.data.unreadCount - 1)
                      : page.data.unreadCount,
                },
              }
            }),
          }
        }
      )

      return { previousNotifications, previousInfiniteNotifications }
    },
    onError: (err, notificationId, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          ["notifications", {}],
          context.previousNotifications
        )
      }
      if (context?.previousInfiniteNotifications) {
        queryClient.setQueryData(
          ["notifications", "infinite"],
          context.previousInfiniteNotifications
        )
      }
    },
    onSuccess: (data, notificationId) => {
      // Find the notification to check if it was unread
      const queries = queryClient.getQueriesData<NotificationsListResponse>({
        queryKey: ["notifications"],
      })

      let wasUnread = false
      for (const [, data] of queries) {
        if (data && data.data && data.data.notifications) {
          const notification = data.data.notifications.find(
            (n) => n.id === notificationId
          )
          if (notification && !notification.isRead) {
            wasUnread = true
            break
          }
        }
      }

      // Update unread count if notification was unread
      if (wasUnread) {
        updateUnreadCountInCache(queryClient, -1)
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })

  // Delete all notifications
  const deleteAllNotifications = useMutation<
    DeleteResponse,
    ApiErrorException,
    void
  >({
    mutationFn: async () => {
      try {
        const response =
          await apiClient.delete<DeleteResponse>("/api/notification")
        return response
      } catch (error) {
        if (error instanceof ApiErrorException) {
          throw error
        } else if (error instanceof Error) {
          throw new ApiErrorException(
            "UNKNOWN_ERROR",
            "An unexpected error occurred while deleting all notifications",
            { originalError: error.message },
            "Please try again later or contact support."
          )
        }
        throw error
      }
    },
    onSuccess: () => {
      // Set unread count to 0 since all are deleted
      queryClient.setQueryData<number>(["notifications", "unread-count"], 0)
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })

  return {
    useGetNotification,
    markAsRead,
    archiveNotification,
    unarchiveNotification,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
  }
}

// Enhanced notification utilities
export const notificationUtils = {
  // Request notification permission
  requestPermission: async (): Promise<boolean> => {
    if (!("Notification" in window)) {
      console.warn("This browser does not support desktop notifications")
      return false
    }

    if (Notification.permission === "granted") {
      return true
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission()
      return permission === "granted"
    }

    return false
  },

  // Show desktop notification
  showDesktopNotification: (
    title: string,
    options?: NotificationOptions
  ): Notification | null => {
    if (!("Notification" in window)) {
      return null
    }

    if (Notification.permission === "granted") {
      return new Notification(title, {
        icon: "/icon-192x192.png",
        badge: "/icon-192x192.png",
        ...options,
      })
    }

    return null
  },

  // Play notification sound
  playNotificationSound: (
    soundType: "success" | "info" | "warning" = "info"
  ) => {
    try {
      // Use Web Audio API for a simple notification sound
      const audioContext = new (
        window.AudioContext || (window as any).webkitAudioContext
      )()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      // Different frequencies for different notification types
      const frequencies = {
        success: 800,
        info: 600,
        warning: 400,
      }

      oscillator.frequency.value = frequencies[soundType]
      oscillator.type = "sine"

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.3
      )

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
    } catch (error) {
      console.warn("Failed to play notification sound:", error)
    }
  },

  // Group notifications by date
  groupNotificationsByDate: (notifications: NotificationSchema[]) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const lastWeek = new Date(today)
    lastWeek.setDate(lastWeek.getDate() - 7)

    const groups = {
      today: [] as NotificationSchema[],
      yesterday: [] as NotificationSchema[],
      thisWeek: [] as NotificationSchema[],
      older: [] as NotificationSchema[],
    }

    notifications.forEach((notification) => {
      const notifDate = new Date(notification.createdAt)
      notifDate.setHours(0, 0, 0, 0)

      if (notifDate.getTime() === today.getTime()) {
        groups.today.push(notification)
      } else if (notifDate.getTime() === yesterday.getTime()) {
        groups.yesterday.push(notification)
      } else if (notifDate >= lastWeek) {
        groups.thisWeek.push(notification)
      } else {
        groups.older.push(notification)
      }
    })

    return groups
  },
}
