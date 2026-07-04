import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { ApiErrorException } from "@/types/api"
import { apiClient } from "@/lib/api-client"

export type MeetingRecord = {
  id: string
  title: string
  scheduledAt: string
  location?: string | null
  agenda?: string | null
  status: "scheduled" | "completed" | "cancelled"
  hostContribution?: string | null
  createdBy?: string | null
}

export interface MeetingsListResponse {
  data: MeetingRecord[]
  total?: number
}

export interface UseMeetingsParams {
  status?: string
  limit?: number
  offset?: number
}

export interface CreateMeetingInput {
  title: string
  scheduledAt: string
  location?: string
  agenda?: string
  status: "scheduled" | "completed" | "cancelled"
  hostContribution?: string
}

export interface UpdateMeetingInput extends Partial<CreateMeetingInput> {
  id: string
}

export interface MutationMeetingResponse {
  success: true
  data: {
    meeting: MeetingRecord
  }
  message: string
  error: null
}

const buildQueryString = (params: UseMeetingsParams = {}) => {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value))
    }
  })

  const query = searchParams.toString()
  return query ? `?${query}` : ""
}

export function useMeetings(params: UseMeetingsParams = {}) {
  return useQuery<MeetingsListResponse, ApiErrorException>({
    queryKey: ["meetings", params],
    queryFn: async () => {
      try {
        const query = buildQueryString(params)
        const response = await fetch(`/api/meetings${query}`, {
          cache: "no-store",
        })

        const payload = await response.json()

        if (!response.ok) {
          const error = payload?.error
          throw new ApiErrorException(
            error?.code || "UNKNOWN_ERROR",
            error?.message || "Failed to fetch meetings",
            error?.details || {},
            error?.help
          )
        }

        return payload as MeetingsListResponse
      } catch (error) {
        if (error instanceof ApiErrorException) {
          throw error
        }
        if (error instanceof Error) {
          throw new ApiErrorException(
            "UNKNOWN_ERROR",
            "An unexpected error occurred while fetching meetings",
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

export function useCreateMeetingMutation() {
  const queryClient = useQueryClient()

  return useMutation<
    MutationMeetingResponse,
    ApiErrorException,
    CreateMeetingInput
  >({
    mutationFn: async (data) =>
      apiClient.post<MutationMeetingResponse>("/api/meetings", data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["meetings"] })
    },
  })
}

export function useUpdateMeetingMutation() {
  const queryClient = useQueryClient()

  return useMutation<
    MutationMeetingResponse,
    ApiErrorException,
    UpdateMeetingInput
  >({
    mutationFn: async ({ id, ...data }) =>
      apiClient.put<MutationMeetingResponse>(`/api/meetings/${id}`, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["meetings"] })
      await queryClient.invalidateQueries({ queryKey: ["minutes"] })
    },
  })
}

export function useCancelMeetingMutation() {
  const queryClient = useQueryClient()

  return useMutation<
    MutationMeetingResponse,
    ApiErrorException,
    { id: string }
  >({
    mutationFn: async ({ id }) =>
      apiClient.delete<MutationMeetingResponse>(`/api/meetings/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["meetings"] })
      await queryClient.invalidateQueries({ queryKey: ["minutes"] })
    },
  })
}
