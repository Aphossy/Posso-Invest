import type { Receipt } from "@/db/schemas/receipt-schema"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { ApiErrorException } from "@/types/api"

export interface ReceiptEnriched extends Receipt {
  memberName: string | null
  memberEmail: string | null
  issuedByName: string | null
}

export interface ReceiptsListResponse {
  data: ReceiptEnriched[]
  total?: number
}

export interface UseReceiptsParams {
  search?: string
  receiptType?: string
  status?: string
  period?: string
  memberId?: string
  issuedBy?: string
  contributionId?: string
  sortBy?: string
  sortOrder?: "asc" | "desc"
  limit?: number
  offset?: number
}

export interface CreateReceiptInput {
  memberId: string
  receiptType: string
  amount: string
  currency?: string
  paymentMethod?: string
  period?: string
  contributionId?: string
  loanId?: string
  penaltyId?: string
  fileUrl?: string
  fileKey?: string
  fileSize?: number
  fileType?: string
  notes?: string
  issuedAt?: string
  status?: string
}

export interface UpdateReceiptInput extends Partial<CreateReceiptInput> {
  id: string
}

function buildQS(params: Record<string, any>) {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v))
  })
  const q = sp.toString()
  return q ? `?${q}` : ""
}

export function useReceipts(params: UseReceiptsParams = {}) {
  return useQuery<ReceiptsListResponse, ApiErrorException>({
    queryKey: ["receipts", params],
    queryFn: async () => {
      const res = await fetch(`/api/receipts${buildQS(params)}`, {
        cache: "no-store",
      })
      const payload = await res.json()
      if (!res.ok) {
        const err = payload?.error
        throw new ApiErrorException(
          err?.code || "UNKNOWN_ERROR",
          err?.message || "Failed to fetch receipts",
          err?.details || {},
          err?.help
        )
      }
      return payload as ReceiptsListResponse
    },
    staleTime: 2 * 60 * 1000,
    retry: (count, error) => {
      if (
        error instanceof ApiErrorException &&
        ["VALIDATION_ERROR", "UNAUTHORIZED", "FORBIDDEN"].includes(error.code)
      )
        return false
      return count < 3
    },
  })
}

export function useIssueReceiptMutation() {
  const qc = useQueryClient()
  return useMutation<
    { data: { receipt: Receipt } },
    ApiErrorException,
    CreateReceiptInput
  >({
    mutationFn: async (data) => {
      const res = await fetch("/api/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const payload = await res.json()
      if (!res.ok) {
        const err = payload?.error
        throw new ApiErrorException(
          err?.code || "UNKNOWN_ERROR",
          err?.message || "Failed to issue receipt",
          err?.details || {},
          err?.help
        )
      }
      return payload
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["receipts"] })
      qc.invalidateQueries({ queryKey: ["contributions"] })
    },
  })
}

export function useUpdateReceiptMutation() {
  const qc = useQueryClient()
  return useMutation<
    { data: { receipt: Receipt } },
    ApiErrorException,
    UpdateReceiptInput
  >({
    mutationFn: async ({ id, ...updates }) => {
      const res = await fetch(`/api/receipts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      const payload = await res.json()
      if (!res.ok) {
        const err = payload?.error
        throw new ApiErrorException(
          err?.code || "UNKNOWN_ERROR",
          err?.message || "Failed to update receipt",
          err?.details || {},
          err?.help
        )
      }
      return payload
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["receipts"] }),
  })
}

export function useDeleteReceiptMutation() {
  const qc = useQueryClient()
  return useMutation<{ success: true }, ApiErrorException, string>({
    mutationFn: async (id) => {
      const res = await fetch(`/api/receipts/${id}`, { method: "DELETE" })
      const payload = await res.json()
      if (!res.ok) {
        const err = payload?.error
        throw new ApiErrorException(
          err?.code || "UNKNOWN_ERROR",
          err?.message || "Failed to delete receipt",
          {},
          err?.help
        )
      }
      return payload
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["receipts"] }),
  })
}
