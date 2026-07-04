import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { ApiErrorException } from "@/types/api"
import { apiClient } from "@/lib/api-client"

export type AttendanceRecord = {
  id: string
  meetingId: string
  memberId: string
  status: "present" | "absent" | "excused" | "late"
  checkedInAt?: string | Date | null
  notes?: string | null
  recordedBy?: string | null
  createdAt: string | Date
  updatedAt: string | Date
  memberName?: string | null
  memberEmail?: string | null
  meetingTitle?: string | null
  recordedByName?: string | null
}

export interface AttendanceListResponse {
  data: AttendanceRecord[]
  total?: number
}

export interface UseAttendanceParams {
  meetingId?: string
  memberId?: string
  status?: string
  recordedBy?: string
  limit?: number
  offset?: number
}

export interface UseAttendanceOptions {
  enabled?: boolean
}

export interface CreateAttendanceInput {
  meetingId: string
  memberId: string
  status: "present" | "absent" | "excused" | "late"
  checkedInAt?: string
  notes?: string
}

export interface UpdateAttendanceInput extends Partial<
  Omit<CreateAttendanceInput, "meetingId" | "memberId">
> {
  id: string
}

export interface MutationAttendanceResponse {
  success: true
  data: {
    attendance: AttendanceRecord
  } | null
  message: string
  error: null
}

const buildQueryString = (params: UseAttendanceParams = {}) => {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value))
    }
  })

  const query = searchParams.toString()
  return query ? `?${query}` : ""
}

export function useAttendance(
  params: UseAttendanceParams = {},
  options: UseAttendanceOptions = {}
) {
  return useQuery<AttendanceListResponse, ApiErrorException>({
    queryKey: ["attendance", params],
    queryFn: async () => {
      try {
        const query = buildQueryString(params)
        const response = await fetch(`/api/attendance${query}`, {
          cache: "no-store",
        })

        const payload = await response.json()

        if (!response.ok) {
          const error = payload?.error
          throw new ApiErrorException(
            error?.code || "UNKNOWN_ERROR",
            error?.message || "Failed to fetch attendance",
            error?.details || {},
            error?.help
          )
        }

        return payload as AttendanceListResponse
      } catch (error) {
        if (error instanceof ApiErrorException) throw error
        if (error instanceof Error) {
          throw new ApiErrorException(
            "UNKNOWN_ERROR",
            "An unexpected error occurred while fetching attendance",
            { originalError: error.message },
            "Please try again later."
          )
        }
        throw error
      }
    },
    staleTime: 2 * 60 * 1000,
    enabled: options.enabled,
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

export function useCreateAttendanceMutation() {
  const queryClient = useQueryClient()

  return useMutation<
    MutationAttendanceResponse,
    ApiErrorException,
    CreateAttendanceInput
  >({
    mutationFn: async (data) =>
      apiClient.post<MutationAttendanceResponse>("/api/attendance", data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["attendance"] })
    },
  })
}

export function useUpdateAttendanceMutation() {
  const queryClient = useQueryClient()

  return useMutation<
    MutationAttendanceResponse,
    ApiErrorException,
    UpdateAttendanceInput
  >({
    mutationFn: async ({ id, ...data }) =>
      apiClient.put<MutationAttendanceResponse>(`/api/attendance/${id}`, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["attendance"] })
    },
  })
}

export function useDeleteAttendanceMutation() {
  const queryClient = useQueryClient()

  return useMutation<
    MutationAttendanceResponse,
    ApiErrorException,
    { id: string }
  >({
    mutationFn: async ({ id }) =>
      apiClient.delete<MutationAttendanceResponse>(`/api/attendance/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["attendance"] })
    },
  })
}
