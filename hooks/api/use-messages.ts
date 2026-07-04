// C:\Users\user\OneDrive\Desktop\trustlink-group\hooks\api\use-messages.ts
import type { Message } from "@/db/schemas/message-schema"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { ApiErrorException } from "@/types/api"
import { apiClient } from "@/lib/api-client"

// Type definitions for API responses
export interface MessageResponse {
  success: true
  data: {
    message: Message
  }
  message: string
}

export interface MessagesListResponse {
  success: true
  data: {
    messages: Message[]
    meta: {
      type: string
      filters: string[]
      count: number
      userRole: string
    }
  }
  message: string
  metadata: {
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasNextPage: boolean
      hasPreviousPage: boolean
    }
  }
}

export interface UpdateMessageInput {
  status?: "new" | "read" | "in-progress" | "resolved" | "archived"
  priority?: "low" | "medium" | "high" | "urgent"
  isStarred?: boolean
  isArchived?: boolean
  assignedTo?: string | null
  internalNotes?: string
}

export interface UseMessagesParams {
  page?: number
  limit?: number
  search?: string
  status?: string
  service?: string
  priority?: string
  isRead?: boolean
  isStarred?: boolean
  isArchived?: boolean
  assignedTo?: string
  sortBy?: "createdAt" | "name" | "subject" | "status" | "priority"
  sortOrder?: "asc" | "desc"
}

export function useMessages(params: UseMessagesParams = {}) {
  return useQuery<MessagesListResponse, ApiErrorException>({
    queryKey: ["messages", params],
    queryFn: async () => {
      const queryParams: Record<string, string> = {}
      if (params.page) queryParams.page = String(params.page)
      if (params.limit) queryParams.limit = String(params.limit)
      if (params.search) queryParams.search = params.search
      if (params.status) queryParams.status = params.status
      if (params.service) queryParams.service = params.service
      if (params.priority) queryParams.priority = params.priority
      if (params.isRead !== undefined)
        queryParams.isRead = String(params.isRead)
      if (params.isStarred !== undefined)
        queryParams.isStarred = String(params.isStarred)
      if (params.isArchived !== undefined)
        queryParams.isArchived = String(params.isArchived)
      if (params.assignedTo) queryParams.assignedTo = params.assignedTo
      if (params.sortBy) queryParams.sortBy = params.sortBy
      if (params.sortOrder) queryParams.sortOrder = params.sortOrder

      const response = await apiClient.get<MessagesListResponse>(
        "/api/message",
        queryParams
      )
      return response
    },
    staleTime: 1 * 60 * 1000,
  })
}

export function useMessageOperations() {
  const queryClient = useQueryClient()

  const useGetMessage = (messageId: string) =>
    useQuery<MessageResponse, ApiErrorException>({
      queryKey: ["message", messageId],
      queryFn: async () => {
        const response = await apiClient.get<MessageResponse>(
          `/api/message/${messageId}`
        )
        return response
      },
      enabled: !!messageId,
    })

  const updateMessage = useMutation<
    MessageResponse,
    ApiErrorException,
    { messageId: string; data: UpdateMessageInput }
  >({
    mutationFn: async ({ messageId, data }) => {
      const response = await apiClient.patch<MessageResponse>(
        `/api/message/${messageId}`,
        data
      )
      return response
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["messages"] })
      queryClient.invalidateQueries({
        queryKey: ["message", variables.messageId],
      })
    },
  })

  const deleteMessage = async (messageId: string) => {
    const response = await apiClient.delete(`/api/message/${messageId}`)
    queryClient.invalidateQueries({ queryKey: ["messages"] })
    return response
  }

  return {
    useGetMessage,
    updateMessage,
    deleteMessage,
  }
}
