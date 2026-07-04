import type { Letter } from "@/db/schemas/letter-schema"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { ApiErrorException } from "@/types/api"

export interface LetterEnriched extends Letter {
  issuedByName: string | null
  recipientMemberName: string | null
}

export interface LettersListResponse {
  data: LetterEnriched[]
  total?: number
}

export interface UseLettersParams {
  search?: string
  letterType?: string
  status?: string
  visibility?: string
  issuedBy?: string
  recipientMemberId?: string
  sortBy?: string
  sortOrder?: "asc" | "desc"
  limit?: number
  offset?: number
}

export interface CreateLetterInput {
  subject: string
  letterType: string
  status?: string
  visibility?: string
  recipient?: string
  recipientMemberId?: string
  description?: string
  notes?: string
  refNumber?: string
  fileUrl?: string
  fileKey?: string
  fileSize?: number
  fileType?: string
  issuedAt?: string
  dueDate?: string
}

export interface UpdateLetterInput extends Partial<CreateLetterInput> {
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

export function useLetters(params: UseLettersParams = {}) {
  return useQuery<LettersListResponse, ApiErrorException>({
    queryKey: ["letters", params],
    queryFn: async () => {
      const res = await fetch(`/api/letters${buildQS(params)}`, {
        cache: "no-store",
      })
      const payload = await res.json()
      if (!res.ok) {
        const err = payload?.error
        throw new ApiErrorException(
          err?.code || "UNKNOWN_ERROR",
          err?.message || "Failed to fetch letters",
          err?.details || {},
          err?.help
        )
      }
      return payload as LettersListResponse
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

export function useCreateLetterMutation() {
  const qc = useQueryClient()
  return useMutation<
    { data: { letter: Letter } },
    ApiErrorException,
    CreateLetterInput
  >({
    mutationFn: async (data) => {
      const res = await fetch("/api/letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const payload = await res.json()
      if (!res.ok) {
        const err = payload?.error
        throw new ApiErrorException(
          err?.code || "UNKNOWN_ERROR",
          err?.message || "Failed to create letter",
          err?.details || {},
          err?.help
        )
      }
      return payload
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["letters"] }),
  })
}

export function useUpdateLetterMutation() {
  const qc = useQueryClient()
  return useMutation<
    { data: { letter: Letter } },
    ApiErrorException,
    UpdateLetterInput
  >({
    mutationFn: async ({ id, ...updates }) => {
      const res = await fetch(`/api/letters/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      const payload = await res.json()
      if (!res.ok) {
        const err = payload?.error
        throw new ApiErrorException(
          err?.code || "UNKNOWN_ERROR",
          err?.message || "Failed to update letter",
          err?.details || {},
          err?.help
        )
      }
      return payload
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["letters"] }),
  })
}

export function useDeleteLetterMutation() {
  const qc = useQueryClient()
  return useMutation<{ success: true }, ApiErrorException, string>({
    mutationFn: async (id) => {
      const res = await fetch(`/api/letters/${id}`, { method: "DELETE" })
      const payload = await res.json()
      if (!res.ok) {
        const err = payload?.error
        throw new ApiErrorException(
          err?.code || "UNKNOWN_ERROR",
          err?.message || "Failed to delete letter",
          {},
          err?.help
        )
      }
      return payload
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["letters"] }),
  })
}
