import type { FinancialDocument } from "@/db/schemas/financial-document-schema"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { ApiErrorException } from "@/types/api"

export interface FinancialDocumentEnriched extends FinancialDocument {
  uploaderName: string | null
  uploaderEmail: string | null
}

export interface FinancialDocumentsListResponse {
  data: FinancialDocumentEnriched[]
  total?: number
}

export interface UseFinancialDocumentsParams {
  search?: string
  docType?: string
  status?: string
  visibility?: string
  period?: string
  fiscalYear?: number
  uploadedBy?: string
  sortBy?: string
  sortOrder?: "asc" | "desc"
  limit?: number
  offset?: number
}

export interface CreateFinancialDocumentInput {
  title: string
  description?: string
  docType: string
  status?: string
  visibility?: string
  period?: string
  fiscalYear?: number
  fileUrl?: string
  fileKey?: string
  fileSize?: number
  fileType?: string
  notes?: string
}

export interface UpdateFinancialDocumentInput extends Partial<CreateFinancialDocumentInput> {
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

export function useFinancialDocuments(
  params: UseFinancialDocumentsParams = {}
) {
  return useQuery<FinancialDocumentsListResponse, ApiErrorException>({
    queryKey: ["financial-documents", params],
    queryFn: async () => {
      const res = await fetch(`/api/financial-documents${buildQS(params)}`, {
        cache: "no-store",
      })
      const payload = await res.json()
      if (!res.ok) {
        const err = payload?.error
        throw new ApiErrorException(
          err?.code || "UNKNOWN_ERROR",
          err?.message || "Failed to fetch financial documents",
          err?.details || {},
          err?.help
        )
      }
      return payload as FinancialDocumentsListResponse
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

export function useCreateFinancialDocumentMutation() {
  const qc = useQueryClient()
  return useMutation<
    { data: { financialDocument: FinancialDocument } },
    ApiErrorException,
    CreateFinancialDocumentInput
  >({
    mutationFn: async (data) => {
      const res = await fetch("/api/financial-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const payload = await res.json()
      if (!res.ok) {
        const err = payload?.error
        throw new ApiErrorException(
          err?.code || "UNKNOWN_ERROR",
          err?.message || "Failed to upload document",
          err?.details || {},
          err?.help
        )
      }
      return payload
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["financial-documents"] }),
  })
}

export function useUpdateFinancialDocumentMutation() {
  const qc = useQueryClient()
  return useMutation<
    { data: { financialDocument: FinancialDocument } },
    ApiErrorException,
    UpdateFinancialDocumentInput
  >({
    mutationFn: async ({ id, ...updates }) => {
      const res = await fetch(`/api/financial-documents/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      const payload = await res.json()
      if (!res.ok) {
        const err = payload?.error
        throw new ApiErrorException(
          err?.code || "UNKNOWN_ERROR",
          err?.message || "Failed to update document",
          err?.details || {},
          err?.help
        )
      }
      return payload
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["financial-documents"] }),
  })
}

export function useDeleteFinancialDocumentMutation() {
  const qc = useQueryClient()
  return useMutation<{ success: true }, ApiErrorException, string>({
    mutationFn: async (id) => {
      const res = await fetch(`/api/financial-documents/${id}`, {
        method: "DELETE",
      })
      const payload = await res.json()
      if (!res.ok) {
        const err = payload?.error
        throw new ApiErrorException(
          err?.code || "UNKNOWN_ERROR",
          err?.message || "Failed to delete document",
          {},
          err?.help
        )
      }
      return payload
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["financial-documents"] }),
  })
}
