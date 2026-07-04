import type { Penalty } from "@/db/schemas/penalty-schema"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { ApiErrorException } from "@/types/api"

// Enriched penalty - base Penalty + joined fields from user and contribution tables
export interface PenaltyEnriched extends Penalty {
  memberName: string | null
  memberEmail: string | null
  issuedByName: string | null
  waivedByName: string | null
  contributionAmount: string | null
  contributionDueDate: Date | string | null
  contributionPaidAt: Date | string | null
  contributionReceiptNumber: string | null
}

export interface PenaltiesListResponse {
  data: PenaltyEnriched[]
  total?: number
}

export interface UsePenaltiesParams {
  memberId?: string
  status?: string // comma-separated: "active,waived"
  period?: string
  contributionId?: string
  limit?: number
  offset?: number
}

export interface CreatePenaltyInput {
  memberId: string
  amount: string
  period: string
  reason?: string
  notes?: string
  contributionId?: string | null
  currency?: string
}

export interface UpdatePenaltyInput {
  id: string
  status?: "active" | "waived"
  amount?: string
  reason?: string
  waivedReason?: string
  notes?: string
}

function buildQueryString(params: UsePenaltiesParams = {}) {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v))
  })
  const q = sp.toString()
  return q ? `?${q}` : ""
}

export function usePenalties(params: UsePenaltiesParams = {}) {
  return useQuery<PenaltiesListResponse, ApiErrorException>({
    queryKey: ["penalties", params],
    queryFn: async () => {
      const response = await fetch(
        `/api/penalties${buildQueryString(params)}`,
        {
          cache: "no-store",
        }
      )
      const payload = await response.json()
      if (!response.ok) {
        const error = payload?.error
        throw new ApiErrorException(
          error?.code || "UNKNOWN_ERROR",
          error?.message || "Failed to fetch penalties",
          error?.details || {},
          error?.help
        )
      }
      return payload as PenaltiesListResponse
    },
    staleTime: 2 * 60 * 1000,
    retry: (failureCount, error) => {
      if (
        error instanceof ApiErrorException &&
        ["VALIDATION_ERROR", "UNAUTHORIZED", "FORBIDDEN"].includes(error.code)
      )
        return false
      return failureCount < 3
    },
  })
}

export function useCreatePenaltyMutation() {
  const queryClient = useQueryClient()
  return useMutation<
    { data: { penalty: Penalty } },
    ApiErrorException,
    CreatePenaltyInput
  >({
    mutationFn: async (data) => {
      const response = await fetch("/api/penalties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const payload = await response.json()
      if (!response.ok) {
        const error = payload?.error
        throw new ApiErrorException(
          error?.code || "UNKNOWN_ERROR",
          typeof error === "string"
            ? error
            : error?.message || "Failed to create penalty",
          error?.details || {},
          error?.help
        )
      }
      return payload
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["penalties"] })
      await queryClient.invalidateQueries({ queryKey: ["contributions"] })
    },
  })
}

export function useUpdatePenaltyMutation() {
  const queryClient = useQueryClient()
  return useMutation<{ data: Penalty }, ApiErrorException, UpdatePenaltyInput>({
    mutationFn: async ({ id, ...updates }) => {
      const response = await fetch(`/api/penalties/${id}`, {
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
            : error?.message || "Failed to update penalty",
          error?.details || {},
          error?.help
        )
      }
      return payload
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["penalties"] })
      await queryClient.invalidateQueries({ queryKey: ["contributions"] })
    },
  })
}

export function useDeletePenaltyMutation() {
  const queryClient = useQueryClient()
  return useMutation<{ success: true }, ApiErrorException, string>({
    mutationFn: async (id) => {
      const response = await fetch(`/api/penalties/${id}`, { method: "DELETE" })
      const payload = await response.json()
      if (!response.ok) {
        const error = payload?.error
        throw new ApiErrorException(
          error?.code || "UNKNOWN_ERROR",
          typeof error === "string"
            ? error
            : error?.message || "Failed to delete penalty",
          {},
          error?.help
        )
      }
      return payload
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["penalties"] })
      await queryClient.invalidateQueries({ queryKey: ["contributions"] })
    },
  })
}
