import type { AnnouncementExportable } from "@/utils/announcement-export-utils"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { ApiErrorException } from "@/types/api"
import { apiClient } from "@/lib/api-client"

export type { AnnouncementExportable as AnnouncementItem }

export interface AnnouncementsListResponse {
  success: boolean
  data: AnnouncementExportable[]
  total: number
  error: null
}

export interface UseAnnouncementsParams {
  status?: string
  audience?: string
  pinned?: boolean
  search?: string
  limit?: number
  offset?: number
}

export interface CreateAnnouncementInput {
  title: string
  summary?: string
  content: string
  status: "draft" | "published" | "archived"
  audience: "members" | "committee" | "public"
  pinned?: boolean
  publishedAt?: string
  expiresAt?: string
  metadata?: { tags?: string[] }
}

export interface UpdateAnnouncementInput extends Partial<CreateAnnouncementInput> {
  id: string
}

function buildQuery(params: UseAnnouncementsParams = {}) {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v))
  })
  const q = sp.toString()
  return q ? `?${q}` : ""
}

export function useAnnouncements(params: UseAnnouncementsParams = {}) {
  return useQuery<AnnouncementsListResponse, ApiErrorException>({
    queryKey: ["announcements", params],
    queryFn: async () => {
      const response = await fetch(`/api/announcements${buildQuery(params)}`, {
        cache: "no-store",
      })
      const payload = await response.json()
      if (!response.ok) {
        const err = payload?.error
        throw new ApiErrorException(
          err?.code || "UNKNOWN_ERROR",
          err?.message || "Failed to fetch announcements",
          err?.details || {},
          err?.help
        )
      }
      return payload as AnnouncementsListResponse
    },
    staleTime: 60 * 1000,
  })
}

export function usePublishedAnnouncements(limit = 100) {
  return useAnnouncements({ status: "published", limit })
}

export function useCreateAnnouncementMutation() {
  const queryClient = useQueryClient()
  return useMutation<
    { success: true; data: { announcement: AnnouncementExportable } },
    ApiErrorException,
    CreateAnnouncementInput
  >({
    mutationFn: (data) => apiClient.post("/api/announcements", data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["announcements"] })
    },
  })
}

export function useUpdateAnnouncementMutation() {
  const queryClient = useQueryClient()
  return useMutation<
    { success: true; data: { announcement: AnnouncementExportable } },
    ApiErrorException,
    UpdateAnnouncementInput
  >({
    mutationFn: async ({ id, ...updates }) => {
      const response = await fetch(`/api/announcements/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      const payload = await response.json()
      if (!response.ok) {
        const err = payload?.error
        throw new ApiErrorException(
          err?.code || "UNKNOWN_ERROR",
          typeof err === "string"
            ? err
            : err?.message || "Failed to update announcement",
          err?.details || {},
          err?.help
        )
      }
      return payload
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["announcements"] })
    },
  })
}

export function useDeleteAnnouncementMutation() {
  const queryClient = useQueryClient()
  return useMutation<{ success: true }, ApiErrorException, string>({
    mutationFn: async (id) => {
      const response = await fetch(`/api/announcements/${id}`, {
        method: "DELETE",
      })
      const payload = await response.json()
      if (!response.ok) {
        const err = payload?.error
        throw new ApiErrorException(
          err?.code || "UNKNOWN_ERROR",
          typeof err === "string"
            ? err
            : err?.message || "Failed to delete announcement",
          err?.details || {},
          err?.help
        )
      }
      return payload
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["announcements"] })
    },
  })
}
