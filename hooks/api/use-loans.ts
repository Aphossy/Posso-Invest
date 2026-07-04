import type { LoanRepayment } from "@/db/schemas/loan-repayment-schema"
import type { Loan } from "@/db/schemas/loan-schema"
import type { LoanExportable } from "@/utils/loan-export-utils"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { ApiErrorException } from "@/types/api"
import { apiClient } from "@/lib/api-client"

export interface LoanRepaymentSummary {
  totalRepayable: number
  totalRepaid: number
  outstanding: number
  progressPercent: number
}

export interface LoanRepaymentsData {
  repayments: LoanRepayment[]
  summary: LoanRepaymentSummary
}

export interface LoanRepaymentsResponse {
  success: true
  data: LoanRepaymentsData
  message: string
  error: null
}

export interface RecordRepaymentInput {
  amount: number
  paymentMethod?: "cash" | "bank_transfer" | "mobile_money" | "check" | "other"
  paidAt?: string
  notes?: string
}

export interface LoansListResponse<T = Loan> {
  data: T[]
  total?: number
}

export interface UseLoansParams {
  memberId?: string
  status?: string
  limit?: number
  offset?: number
}

export interface CreateLoanInput {
  requestedAmount: string
  termMonths?: number
  notes?: string
  metadata?: {
    reason?: string
  }
  memberId?: string
}

export interface CreateLoanResponse {
  success: true
  data: Loan
  message: string
  error: null
}

export interface UpdateLoanInput {
  requestedAmount?: string
  termMonths?: number
  notes?: string
  metadata?: {
    reason?: string
  }
}

export interface UpdateLoanResponse {
  success: true
  data: Loan
  message: string
  error: null
}

export interface DeleteLoanResponse {
  success: true
  data: { deletedId: string }
  message: string
  error: null
}

const MAX_LOAN_QUERY_LIMIT = 200

async function fetchLoanPage<T>(params: UseLoansParams = {}, offset = 0) {
  const limit = Math.min(
    params.limit ?? MAX_LOAN_QUERY_LIMIT,
    MAX_LOAN_QUERY_LIMIT
  )
  return apiClient.get<LoansListResponse<T>>("/api/loans", {
    ...params,
    limit,
    offset,
  })
}

async function fetchAllLoans<T>(params: UseLoansParams = {}) {
  const initialPage = await fetchLoanPage<T>(params, params.offset ?? 0)
  const allRows = [...initialPage.data]
  const total = initialPage.total ?? initialPage.data.length
  let nextOffset = (params.offset ?? 0) + initialPage.data.length

  while (nextOffset < total && initialPage.data.length > 0) {
    const nextPage = await fetchLoanPage<T>(params, nextOffset)
    allRows.push(...nextPage.data)
    nextOffset += nextPage.data.length
    if (nextPage.data.length === 0) {
      break
    }
  }

  return {
    ...initialPage,
    data: allRows,
  }
}

export function useLoans<T = Loan>(params: UseLoansParams = {}) {
  return useQuery<LoansListResponse<T>, ApiErrorException>({
    queryKey: ["loans", params],
    queryFn: async () => {
      try {
        return await apiClient.get<LoansListResponse<T>>("/api/loans", params)
      } catch (error) {
        if (error instanceof ApiErrorException) {
          throw error
        }
        if (error instanceof Error) {
          throw new ApiErrorException(
            "UNKNOWN_ERROR",
            "An unexpected error occurred while fetching loans",
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

export function useMyLoans(limit = 5) {
  return useLoans({ limit })
}

export function useAdminLoans() {
  const query = useQuery<LoansListResponse<LoanExportable>, ApiErrorException>({
    queryKey: ["loans", "admin"],
    queryFn: async () => {
      try {
        return await fetchAllLoans<LoanExportable>()
      } catch (error) {
        if (error instanceof ApiErrorException) {
          throw error
        }
        if (error instanceof Error) {
          throw new ApiErrorException(
            "UNKNOWN_ERROR",
            "An unexpected error occurred while fetching loans",
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

  return {
    ...query,
    loans: query.data?.data ?? [],
  }
}

export function useTreasurerLoanRequests() {
  const requestedLoansQuery = useQuery<
    LoansListResponse<LoanExportable>,
    ApiErrorException
  >({
    queryKey: ["loans", "treasurer", "requested"],
    queryFn: async () => fetchAllLoans<LoanExportable>({ status: "requested" }),
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
  const approvedLoansQuery = useQuery<
    LoansListResponse<LoanExportable>,
    ApiErrorException
  >({
    queryKey: ["loans", "treasurer", "approved"],
    queryFn: async () => fetchAllLoans<LoanExportable>({ status: "approved" }),
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
  const allLoansQuery = useQuery<
    LoansListResponse<LoanExportable>,
    ApiErrorException
  >({
    queryKey: ["loans", "treasurer", "all"],
    queryFn: async () => fetchAllLoans<LoanExportable>(),
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

  const requestedLoans = requestedLoansQuery.data?.data ?? []
  const approvedLoans = approvedLoansQuery.data?.data ?? []
  const allLoans = allLoansQuery.data?.data ?? []

  const sumAmount = (loans: typeof allLoans) =>
    loans.reduce((sum, item) => {
      const value = Number.parseFloat(
        item.approvedAmount || item.requestedAmount || "0"
      )
      return Number.isNaN(value) ? sum : sum + value
    }, 0)

  const disbursedLoans = allLoans.filter((l) =>
    ["disbursed", "repaying", "repaid", "overdue"].includes(l.status)
  )
  const disbursedTotal = sumAmount(disbursedLoans)
  const totalPortfolio = sumAmount(allLoans)

  return {
    requestedLoansQuery,
    approvedLoansQuery,
    allLoansQuery,
    requestedLoans,
    approvedLoans,
    allLoans,
    requestedCount:
      requestedLoansQuery.data?.total ?? requestedLoans.length ?? 0,
    approvedCount: approvedLoansQuery.data?.total ?? approvedLoans.length ?? 0,
    disbursedTotal,
    totalPortfolio,
    isPending:
      requestedLoansQuery.isPending ||
      approvedLoansQuery.isPending ||
      allLoansQuery.isPending,
    isRefetching:
      requestedLoansQuery.isRefetching ||
      approvedLoansQuery.isRefetching ||
      allLoansQuery.isRefetching,
    error:
      requestedLoansQuery.error ??
      approvedLoansQuery.error ??
      allLoansQuery.error ??
      null,
    refetch: async () => {
      await Promise.all([
        requestedLoansQuery.refetch(),
        approvedLoansQuery.refetch(),
        allLoansQuery.refetch(),
      ])
    },
  }
}

export function useCreateLoanMutation() {
  const queryClient = useQueryClient()

  return useMutation<CreateLoanResponse, ApiErrorException, CreateLoanInput>({
    mutationFn: async (data) =>
      apiClient.post<CreateLoanResponse>("/api/loans", data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["loans"] })
    },
  })
}

export function useUpdateLoanMutation() {
  const queryClient = useQueryClient()

  return useMutation<
    UpdateLoanResponse,
    ApiErrorException,
    { id: string; data: UpdateLoanInput }
  >({
    mutationFn: async ({ id, data }) =>
      apiClient.put<UpdateLoanResponse>(`/api/loans/${id}`, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["loans"] })
    },
  })
}

export function useDeleteLoanMutation() {
  const queryClient = useQueryClient()

  return useMutation<DeleteLoanResponse, ApiErrorException, { id: string }>({
    mutationFn: async ({ id }) =>
      apiClient.delete<DeleteLoanResponse>(`/api/loans/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["loans"] })
    },
  })
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

export function useTreasurerLoanDisbursements() {
  // reuses the same cache entry as useTreasurerLoanRequests
  const approvedLoansQuery = useQuery<
    LoansListResponse<LoanExportable>,
    ApiErrorException
  >({
    queryKey: ["loans", "treasurer", "approved"],
    queryFn: async () => fetchAllLoans<LoanExportable>({ status: "approved" }),
    staleTime: 2 * 60 * 1000,
    retry: retryFn,
  })

  const disbursedLoansQuery = useQuery<
    LoansListResponse<LoanExportable>,
    ApiErrorException
  >({
    queryKey: ["loans", "treasurer", "disbursed"],
    queryFn: async () => fetchAllLoans<LoanExportable>({ status: "disbursed" }),
    staleTime: 2 * 60 * 1000,
    retry: retryFn,
  })

  const approvedLoans = approvedLoansQuery.data?.data ?? []
  const disbursedLoans = disbursedLoansQuery.data?.data ?? []
  const allLoans = [...approvedLoans, ...disbursedLoans]

  const disbursedTotal = disbursedLoans.reduce((sum, item) => {
    const value = Number.parseFloat(
      item.approvedAmount || item.requestedAmount || "0"
    )
    return Number.isNaN(value) ? sum : sum + value
  }, 0)

  return {
    approvedLoansQuery,
    disbursedLoansQuery,
    approvedLoans,
    disbursedLoans,
    allLoans,
    approvedCount: approvedLoansQuery.data?.total ?? approvedLoans.length,
    disbursedCount: disbursedLoansQuery.data?.total ?? disbursedLoans.length,
    disbursedTotal,
    isPending: approvedLoansQuery.isPending || disbursedLoansQuery.isPending,
    isRefetching:
      approvedLoansQuery.isRefetching || disbursedLoansQuery.isRefetching,
    error: approvedLoansQuery.error ?? disbursedLoansQuery.error ?? null,
    refetch: async () => {
      await Promise.all([
        approvedLoansQuery.refetch(),
        disbursedLoansQuery.refetch(),
      ])
    },
  }
}

export function useLoanRepayments(loanId: string | undefined) {
  return useQuery<LoanRepaymentsResponse, ApiErrorException>({
    queryKey: ["loan-repayments", loanId],
    enabled: Boolean(loanId),
    queryFn: async () =>
      apiClient.get<LoanRepaymentsResponse>(`/api/loans/${loanId}/repayments`),
    staleTime: 2 * 60 * 1000,
    retry: retryFn,
  })
}

export function useRecordRepaymentMutation(loanId: string) {
  const queryClient = useQueryClient()

  return useMutation<
    {
      success: true
      data: {
        repayment: LoanRepayment
        summary: LoanRepaymentSummary
        fullyRepaid: boolean
      }
      message: string
      error: null
    },
    ApiErrorException,
    RecordRepaymentInput
  >({
    mutationFn: async (data) =>
      apiClient.post(`/api/loans/${loanId}/repayments`, data),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["loan-repayments", loanId],
        }),
        queryClient.invalidateQueries({ queryKey: ["loans"] }),
      ])
    },
  })
}

export function useDeleteRepaymentMutation(loanId: string) {
  const queryClient = useQueryClient()

  return useMutation<
    { success: true; data: { deletedId: string }; message: string },
    ApiErrorException,
    { repaymentId: string }
  >({
    mutationFn: async ({ repaymentId }) =>
      apiClient.delete(
        `/api/loans/${loanId}/repayments?repaymentId=${repaymentId}`
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["loan-repayments", loanId],
        }),
        queryClient.invalidateQueries({ queryKey: ["loans"] }),
      ])
    },
  })
}

export function useTreasurerLoanRepayments() {
  // active = disbursed + repaying + overdue (single query, comma-separated)
  const activeLoansQuery = useQuery<
    LoansListResponse<LoanExportable>,
    ApiErrorException
  >({
    queryKey: ["loans", "treasurer", "active-repayments"],
    queryFn: async () =>
      fetchAllLoans<LoanExportable>({
        status: "disbursed,repaying,overdue",
      }),
    staleTime: 2 * 60 * 1000,
    retry: retryFn,
  })

  const repaidLoansQuery = useQuery<
    LoansListResponse<LoanExportable>,
    ApiErrorException
  >({
    queryKey: ["loans", "treasurer", "repaid"],
    queryFn: async () => fetchAllLoans<LoanExportable>({ status: "repaid" }),
    staleTime: 2 * 60 * 1000,
    retry: retryFn,
  })

  const activeLoans = activeLoansQuery.data?.data ?? []
  const repaidLoans = repaidLoansQuery.data?.data ?? []
  const allLoans = [...activeLoans, ...repaidLoans]

  const repayingLoans = activeLoans.filter((l) => l.status === "repaying")
  const overdueLoans = activeLoans.filter((l) => l.status === "overdue")
  const disbursedNotStarted = activeLoans.filter(
    (l) => l.status === "disbursed"
  )

  const outstandingTotal = activeLoans.reduce((sum, item) => {
    // Prefer the server-computed outstanding balance (total repayable minus
    // recorded repayments); fall back to the full amount for legacy rows.
    if (item.outstandingBalance != null) {
      return sum + item.outstandingBalance
    }
    const value = Number.parseFloat(
      item.approvedAmount || item.requestedAmount || "0"
    )
    return Number.isNaN(value) ? sum : sum + value
  }, 0)

  return {
    activeLoansQuery,
    repaidLoansQuery,
    activeLoans,
    repaidLoans,
    repayingLoans,
    overdueLoans,
    disbursedNotStarted,
    allLoans,
    activeCount: activeLoansQuery.data?.total ?? activeLoans.length,
    repayingCount: repayingLoans.length,
    overdueCount: overdueLoans.length,
    repaidCount: repaidLoansQuery.data?.total ?? repaidLoans.length,
    outstandingTotal,
    isPending: activeLoansQuery.isPending || repaidLoansQuery.isPending,
    isRefetching:
      activeLoansQuery.isRefetching || repaidLoansQuery.isRefetching,
    error: activeLoansQuery.error ?? repaidLoansQuery.error ?? null,
    refetch: async () => {
      await Promise.all([
        activeLoansQuery.refetch(),
        repaidLoansQuery.refetch(),
      ])
    },
  }
}
