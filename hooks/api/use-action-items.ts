import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { ApiErrorException } from "@/types/api"
import { apiClient } from "@/lib/api-client"

export type ActionItemRecord = {
  id: string
  title: string
  description?: string | null
  status: "open" | "in_progress" | "blocked" | "done" | "cancelled"
  priority: "low" | "medium" | "high" | "urgent"
  dueDate?: string | Date | null
  completedAt?: string | Date | null
  meetingId?: string | null
  minutesId?: string | null
  ownerId?: string | null
  createdBy?: string | null
  notes?: string | null
  createdAt: string | Date
  updatedAt: string | Date
  ownerName?: string | null
  ownerEmail?: string | null
  createdByName?: string | null
  meetingTitle?: string | null
}

export interface ActionItemsListResponse {
  data: ActionItemRecord[]
  total?: number
}

export interface UseActionItemsParams {
  meetingId?: string
  minutesId?: string
  ownerId?: string
  status?: string
  priority?: string
  createdBy?: string
  limit?: number
  offset?: number
}

export interface CreateActionItemInput {
  title: string
  description?: string
  meetingId?: string
  minutesId?: string
  ownerId?: string
  dueDate?: string
  status: "open" | "in_progress" | "blocked" | "done" | "cancelled"
  priority: "low" | "medium" | "high" | "urgent"
  notes?: string
}

export interface UpdateActionItemInput extends Partial<CreateActionItemInput> {
  id: string
  completedAt?: string
}

export interface MutationActionItemResponse {
  success: true
  data: {
    actionItem: ActionItemRecord
  } | null
  message: string
  error: null
}

const buildQueryString = (params: UseActionItemsParams = {}) => {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value))
    }
  })

  const query = searchParams.toString()
  return query ? `?${query}` : ""
}

export function useActionItems(params: UseActionItemsParams = {}) {
  return useQuery<ActionItemsListResponse, ApiErrorException>({
    queryKey: ["action-items", params],
    queryFn: async () => {
      try {
        const query = buildQueryString(params)
        const response = await fetch(`/api/action-items${query}`, {
          cache: "no-store",
        })

        const payload = await response.json()

        if (!response.ok) {
          const error = payload?.error
          throw new ApiErrorException(
            error?.code || "UNKNOWN_ERROR",
            error?.message || "Failed to fetch action items",
            error?.details || {},
            error?.help
          )
        }

        return payload as ActionItemsListResponse
      } catch (error) {
        if (error instanceof ApiErrorException) {
          throw error
        }
        if (error instanceof Error) {
          throw new ApiErrorException(
            "UNKNOWN_ERROR",
            "An unexpected error occurred while fetching action items",
            { originalError: error.message },
            "Please try again later."
          )
        }
        throw error
      }
    },
    staleTime: 2 * 60 * 1000,
    retry: (failureCount, error) => {
      if (
        error instanceof ApiErrorException &&
        ["VALIDATION_ERROR", "UNAUTHORIZED", "FORBIDDEN"].includes(error.code)
      ) {
        return false
      }
      return failureCount < 3
    },
  })
}

export function useCreateActionItemMutation() {
  const queryClient = useQueryClient()

  return useMutation<
    MutationActionItemResponse,
    ApiErrorException,
    CreateActionItemInput
  >({
    mutationFn: async (data) =>
      apiClient.post<MutationActionItemResponse>("/api/action-items", data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["action-items"] })
    },
  })
}

export function useUpdateActionItemMutation() {
  const queryClient = useQueryClient()

  return useMutation<
    MutationActionItemResponse,
    ApiErrorException,
    UpdateActionItemInput
  >({
    mutationFn: async ({ id, ...data }) =>
      apiClient.put<MutationActionItemResponse>(
        `/api/action-items/${id}`,
        data
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["action-items"] })
    },
  })
}

export function useDeleteActionItemMutation() {
  const queryClient = useQueryClient()

  return useMutation<
    MutationActionItemResponse,
    ApiErrorException,
    { id: string }
  >({
    mutationFn: async ({ id }) =>
      apiClient.delete<MutationActionItemResponse>(`/api/action-items/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["action-items"] })
    },
  })
}
