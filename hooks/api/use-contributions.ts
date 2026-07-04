import { useMemo } from "react"
import type { Contribution } from "@/db/schemas/contribution-schema"
import type { ContributionExportable } from "@/utils/contribution-export-utils"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { ApiErrorException } from "@/types/api"
import { apiClient } from "@/lib/api-client"

export interface ContributionAttachment {
  id: string
  name: string
  url: string
  signedUrl?: string
  size: number
  type: string
  key?: string
  dbId?: string
  storageProvider?: string
  publicId?: string
  width?: number
  height?: number
  format?: string
  thumbnailUrl?: string
  mediumUrl?: string
}

export interface CreateContributionInput {
  memberId: string
  amount: string
  period: string
  status: "pending" | "confirmed" | "late" | "waived"
  receiptNumber?: string
  penaltyAmount?: string
  paidAt?: string
  notes?: string
  metadata?: {
    paymentMethod?: "cash" | "momo" | "bank"
    attachments?: ContributionAttachment[]
  }
}

export interface CreateContributionResponse {
  success: true
  data: {
    contribution: Contribution
  }
  message: string
  error: null
  metadata?: Record<string, unknown>
}

export interface ContributionsListResponse {
  data: ContributionExportable[]
  total?: number
}

export interface UseContributionsParams {
  memberId?: string
  status?: string
  period?: string
  limit?: number
  offset?: number
}

const buildQueryString = (params: UseContributionsParams = {}) => {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value))
    }
  })

  const query = searchParams.toString()
  return query ? `?${query}` : ""
}

export function useContributions(params: UseContributionsParams = {}) {
  return useQuery<ContributionsListResponse, ApiErrorException>({
    queryKey: ["contributions", params],
    queryFn: async () => {
      try {
        const query = buildQueryString(params)
        const response = await fetch(`/api/contributions${query}`, {
          cache: "no-store",
        })

        const payload = await response.json()

        if (!response.ok) {
          const error = payload?.error
          throw new ApiErrorException(
            error?.code || "UNKNOWN_ERROR",
            error?.message || "Failed to fetch contributions",
            error?.details || {},
            error?.help
          )
        }

        return payload as ContributionsListResponse
      } catch (error) {
        if (error instanceof ApiErrorException) {
          throw error
        }
        if (error instanceof Error) {
          throw new ApiErrorException(
            "UNKNOWN_ERROR",
            "An unexpected error occurred while fetching contributions",
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

export function useMyContributions(limit = 50) {
  return useContributions({ limit })
}

export function useMyConfirmedSavings() {
  const { data, isPending, error } = useMyContributions(1000)

  const totalSavings = useMemo(() => {
    if (!data?.data) return 0
    return data.data.reduce((sum, contribution) => {
      if (contribution.status === "confirmed") {
        const amount = Number.parseFloat(String(contribution.amount) || "0")
        return sum + (Number.isNaN(amount) ? 0 : amount)
      }
      return sum
    }, 0)
  }, [data?.data])

  return {
    totalSavings,
    isPending,
    error,
  }
}

export function useCreateContributionMutation() {
  const queryClient = useQueryClient()

  return useMutation<
    CreateContributionResponse,
    ApiErrorException,
    CreateContributionInput
  >({
    mutationFn: async (data) =>
      apiClient.post<CreateContributionResponse>("/api/contributions", data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["contributions"] })
    },
  })
}

export interface UpdateContributionInput {
  id: string
  status?: "pending" | "confirmed" | "late" | "waived"
  penaltyAmount?: string
  notes?: string
  amount?: string
  period?: string
  paidAt?: string
}

export function useUpdateContributionMutation() {
  const queryClient = useQueryClient()

  return useMutation<
    { data: Contribution },
    ApiErrorException,
    UpdateContributionInput
  >({
    mutationFn: async ({ id, ...updates }) => {
      const response = await fetch(`/api/contributions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      const payload = await response.json()
      if (!response.ok) {
        const error = payload?.error
        throw new ApiErrorException(
          error?.code || "UNKNOWN_ERROR",
          typeof error === "string"
            ? error
            : error?.message || "Failed to update contribution",
          error?.details || {},
          error?.help
        )
      }
      return payload
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["contributions"] })
    },
  })
}
