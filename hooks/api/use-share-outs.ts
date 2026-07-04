import type {
  ShareOut,
  ShareOutAllocation,
} from "@/db/schemas/share-out-schema"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { ApiErrorException } from "@/types/api"
import { apiClient } from "@/lib/api-client"

export type ShareOutAllocationWithMember = ShareOutAllocation & {
  memberName: string | null
  memberEmail: string | null
}

interface ListResponse {
  success: true
  data: ShareOut[]
}

interface DetailResponse {
  success: true
  data: { cycle: ShareOut; allocations: ShareOutAllocationWithMember[] }
}

export interface MyShareOutStatement {
  allocationId: string
  shareOutId: string
  contributionBase: string
  sharePercent: string
  grossShare: string
  loanDeduction: string
  penaltyDeduction: string
  netShare: string
  allocationStatus: "pending" | "paid"
  paidAt: string | null
  label: string
  fiscalYear: number
  cycleStatus: string
  currency: string
  distributedAt: string | null
}

interface MyResponse {
  success: true
  data: MyShareOutStatement[]
}

export interface CreateShareOutInput {
  label?: string
  fiscalYear?: number
  distributableAmount: number
  notes?: string
}

const retryFn = (failureCount: number, error: ApiErrorException) => {
  if (
    error instanceof ApiErrorException &&
    ["VALIDATION_ERROR", "UNAUTHORIZED", "FORBIDDEN"].includes(error.code)
  ) {
    return false
  }
  return failureCount < 3
}

export function useShareOuts() {
  return useQuery<ListResponse, ApiErrorException>({
    queryKey: ["share-outs"],
    queryFn: async () => apiClient.get<ListResponse>("/api/share-outs"),
    staleTime: 60 * 1000,
    retry: retryFn,
  })
}

export function useShareOut(id: string | undefined) {
  return useQuery<DetailResponse, ApiErrorException>({
    queryKey: ["share-outs", id],
    enabled: Boolean(id),
    queryFn: async () => apiClient.get<DetailResponse>(`/api/share-outs/${id}`),
    staleTime: 60 * 1000,
    retry: retryFn,
  })
}

export function useMyShareOuts() {
  return useQuery<MyResponse, ApiErrorException>({
    queryKey: ["share-outs", "me"],
    queryFn: async () => apiClient.get<MyResponse>("/api/share-outs/me"),
    staleTime: 60 * 1000,
    retry: retryFn,
  })
}

export function useCreateShareOut() {
  const queryClient = useQueryClient()
  return useMutation<DetailResponse, ApiErrorException, CreateShareOutInput>({
    mutationFn: async (data) =>
      apiClient.post<DetailResponse>("/api/share-outs", data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["share-outs"] })
    },
  })
}

export function useShareOutAction(id: string) {
  const queryClient = useQueryClient()
  return useMutation<
    { success: true; data: ShareOut },
    ApiErrorException,
    { action: "approve" | "distribute" | "cancel" }
  >({
    mutationFn: async (body) => apiClient.patch(`/api/share-outs/${id}`, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["share-outs"] })
    },
  })
}

export function useDeleteShareOut() {
  const queryClient = useQueryClient()
  return useMutation<
    { success: true; data: { deletedId: string } },
    ApiErrorException,
    { id: string }
  >({
    mutationFn: async ({ id }) => apiClient.delete(`/api/share-outs/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["share-outs"] })
    },
  })
}
