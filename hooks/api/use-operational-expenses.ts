import type { OperationalExpense } from "@/db/schemas/operational-expense-schema"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { ApiErrorException } from "@/types/api"

export interface OperationalExpenseEnriched extends OperationalExpense {
  submittedByName?: string | null
  submittedByEmail?: string | null
  approvedByName?: string | null
}

export interface ExpensesListResponse {
  data: OperationalExpenseEnriched[]
  total?: number
}

export interface UseExpensesParams {
  submittedById?: string
  status?: string
  category?: string
  limit?: number
  offset?: number
}

export interface CreateExpenseInput {
  amount: string
  category: OperationalExpense["category"]
  description: string
  expenseDate: string
  notes?: string
  receiptUrl?: string
}

export interface ApproveExpenseInput {
  status: "approved" | "rejected"
  rejectionNote?: string
}

function buildQuery(params: UseExpensesParams = {}) {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v))
  })
  const q = sp.toString()
  return q ? `?${q}` : ""
}

async function fetchExpenses(params: UseExpensesParams = {}) {
  const res = await fetch(`/api/operational-expenses${buildQuery(params)}`, {
    cache: "no-store",
  })
  const payload = await res.json()
  if (!res.ok) {
    const err = payload?.error
    throw new ApiErrorException(
      err?.code ?? "UNKNOWN_ERROR",
      err?.message ?? "Failed to fetch expenses",
      err?.details ?? {},
      err?.help
    )
  }
  return payload as ExpensesListResponse
}

export function useOperationalExpenses(params: UseExpensesParams = {}) {
  return useQuery<ExpensesListResponse, ApiErrorException>({
    queryKey: ["operational-expenses", params],
    queryFn: () => fetchExpenses(params),
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

export function useAllOperationalExpenses() {
  return useOperationalExpenses({ limit: 500 })
}

export function useMyOperationalExpenses() {
  return useOperationalExpenses({ limit: 200 })
}

export function useCreateExpenseMutation() {
  const queryClient = useQueryClient()

  return useMutation<
    { success: true; data: OperationalExpense },
    ApiErrorException,
    CreateExpenseInput
  >({
    mutationFn: async (data) => {
      const res = await fetch("/api/operational-expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const payload = await res.json()
      if (!res.ok) {
        const err = payload?.error
        throw new ApiErrorException(
          err?.code ?? "UNKNOWN_ERROR",
          err?.message ?? "Failed to create expense",
          err?.details ?? {},
          err?.help
        )
      }
      return payload
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operational-expenses"] })
    },
  })
}

export function useApproveExpenseMutation() {
  const queryClient = useQueryClient()

  return useMutation<
    { success: true; data: OperationalExpense },
    ApiErrorException,
    { id: string } & ApproveExpenseInput
  >({
    mutationFn: async ({ id, ...data }) => {
      const res = await fetch(`/api/operational-expenses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const payload = await res.json()
      if (!res.ok) {
        const err = payload?.error
        throw new ApiErrorException(
          err?.code ?? "UNKNOWN_ERROR",
          err?.message ?? "Failed to update expense",
          err?.details ?? {},
          err?.help
        )
      }
      return payload
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operational-expenses"] })
    },
  })
}

export function useUpdateExpenseMutation() {
  const queryClient = useQueryClient()

  return useMutation<
    { success: true; data: OperationalExpense },
    ApiErrorException,
    { id: string } & Partial<CreateExpenseInput>
  >({
    mutationFn: async ({ id, ...data }) => {
      const res = await fetch(`/api/operational-expenses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const payload = await res.json()
      if (!res.ok) {
        const err = payload?.error
        throw new ApiErrorException(
          err?.code ?? "UNKNOWN_ERROR",
          err?.message ?? "Failed to update expense",
          err?.details ?? {},
          err?.help
        )
      }
      return payload
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operational-expenses"] })
    },
  })
}

export function useDeleteExpenseMutation() {
  const queryClient = useQueryClient()

  return useMutation<
    { success: true; data: { deletedId: string } },
    ApiErrorException,
    { id: string }
  >({
    mutationFn: async ({ id }) => {
      const res = await fetch(`/api/operational-expenses/${id}`, {
        method: "DELETE",
      })
      const payload = await res.json()
      if (!res.ok) {
        const err = payload?.error
        throw new ApiErrorException(
          err?.code ?? "UNKNOWN_ERROR",
          err?.message ?? "Failed to delete expense",
          err?.details ?? {},
          err?.help
        )
      }
      return payload
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operational-expenses"] })
    },
  })
}
