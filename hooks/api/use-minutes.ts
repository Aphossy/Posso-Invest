import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { ApiErrorException } from "@/types/api"
import { apiClient } from "@/lib/api-client"

export type MinuteRecord = {
  id: string
  meetingId: string
  status: "draft" | "finalized" | "published"
  summary?: string | null
  decisions?: { items?: string[] } | null
  actionItems?: {
    items?: {
      task: string
      owner?: string
      dueDate?: string
      status?: string
    }[]
  } | null
  attendance?: {
    presentIds?: string[]
    absentIds?: string[]
    guests?: string[]
  } | null
  recordedBy?: string | null
  approvedBy?: string | null
  publishedAt?: string | Date | null
  createdAt: string | Date
  updatedAt: string | Date
  meetingTitle?: string | null
  recordedByName?: string | null
  approvedByName?: string | null
}

export interface MinutesListResponse {
  data: MinuteRecord[]
  total?: number
}

export interface UseMinutesParams {
  meetingId?: string
  status?: string
  limit?: number
  offset?: number
}

export interface CreateMinuteInput {
  meetingId: string
  status: "draft" | "finalized" | "published"
  summary?: string
  decisions?: { items?: string[] }
  actionItems?: {
    items?: {
      task: string
      owner?: string
      dueDate?: string
      status?: string
    }[]
  }
  attendance?: {
    presentIds?: string[]
    absentIds?: string[]
    guests?: string[]
  }
}

export interface UpdateMinuteInput extends Partial<CreateMinuteInput> {
  id: string
  approvedBy?: string | null
  publishedAt?: string
}

export interface MutationMinuteResponse {
  success: true
  data: {
    minute: MinuteRecord
  } | null
  message: string
  error: null
}

const buildQueryString = (params: UseMinutesParams = {}) => {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value))
    }
  })

  const query = searchParams.toString()
  return query ? `?${query}` : ""
}

export function useMinutes(params: UseMinutesParams = {}) {
  return useQuery<MinutesListResponse, ApiErrorException>({
    queryKey: ["minutes", params],
    queryFn: async () => {
      try {
        const query = buildQueryString(params)
        const response = await fetch(`/api/minutes${query}`, {
          cache: "no-store",
        })

        const payload = await response.json()

        if (!response.ok) {
          const error = payload?.error
          throw new ApiErrorException(
            error?.code || "UNKNOWN_ERROR",
            error?.message || "Failed to fetch minutes",
            error?.details || {},
            error?.help
          )
        }

        return payload as MinutesListResponse
      } catch (error) {
        if (error instanceof ApiErrorException) {
          throw error
        }
        if (error instanceof Error) {
          throw new ApiErrorException(
            "UNKNOWN_ERROR",
            "An unexpected error occurred while fetching minutes",
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

export function useCreateMinuteMutation() {
  const queryClient = useQueryClient()

  return useMutation<
    MutationMinuteResponse,
    ApiErrorException,
    CreateMinuteInput
  >({
    mutationFn: async (data) =>
      apiClient.post<MutationMinuteResponse>("/api/minutes", data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["minutes"] })
      await queryClient.invalidateQueries({ queryKey: ["meetings"] })
    },
  })
}

export function useUpdateMinuteMutation() {
  const queryClient = useQueryClient()

  return useMutation<
    MutationMinuteResponse,
    ApiErrorException,
    UpdateMinuteInput
  >({
    mutationFn: async ({ id, ...data }) =>
      apiClient.put<MutationMinuteResponse>(`/api/minutes/${id}`, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["minutes"] })
      await queryClient.invalidateQueries({ queryKey: ["meetings"] })
    },
  })
}

export function useDeleteMinuteMutation() {
  const queryClient = useQueryClient()

  return useMutation<MutationMinuteResponse, ApiErrorException, { id: string }>(
    {
      mutationFn: async ({ id }) =>
        apiClient.delete<MutationMinuteResponse>(`/api/minutes/${id}`),
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: ["minutes"] })
        await queryClient.invalidateQueries({ queryKey: ["meetings"] })
      },
    }
  )
}
