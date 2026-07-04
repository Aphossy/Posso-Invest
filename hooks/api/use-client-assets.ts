import type { Asset, AssetCollection } from "@/db/schemas/asset-schema"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { ApiErrorException } from "@/types/api"
import { apiClient } from "@/lib/api-client"

// Response types
export interface AssetResponse {
  success: true
  data: {
    asset: Asset
  }
  message: string
  error: null
  metadata: any
}

export interface AssetsListResponse {
  success: true
  data: {
    assets: Asset[]
  }
  message: string
  error: null
  metadata: {
    requestId: string
    serverTimestamp: string
    processingTime: number
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasNextPage: boolean
      hasPreviousPage: boolean
    }
    links: {
      self: string
      first: string
      last: string
      next?: string
      prev?: string
    }
  }
}

export interface AssetStatsResponse {
  success: true
  data: {
    total: number
    byType: Record<string, number>
    byCategory: Record<string, number>
    byVisibility: Record<string, number>
    totalSize: number
    recentUploads: number
  }
  message: string
  error: null
  metadata: any
}

// Input types
export interface CreateAssetInput {
  name: string
  description?: string
  fileUrl: string
  fileKey?: string
  fileType?: string
  fileSize?: number
  assetType:
    | "image"
    | "video"
    | "audio"
    | "document"
    | "archive"
    | "code"
    | "font"
    | "other"
  storageProvider?: string
  thumbnailUrl?: string
  previewUrl?: string
  dimensions?: {
    width?: number
    height?: number
    duration?: number
  }
  metadata?: Record<string, unknown>
  category?: string
  tags?: string[]
  projectId?: string
  uploadedBy?: string
  visibility?: "public" | "authenticated" | "committee" | "admin" | "private"
  alt?: string
  caption?: string
}

export interface UpdateAssetInput {
  name?: string
  description?: string
  category?: string
  tags?: string[]
  visibility?: "public" | "authenticated" | "committee" | "admin" | "private"
  alt?: string
  caption?: string
  isFeatured?: boolean
  isPinned?: boolean
}

export interface UseAssetsParams {
  page?: number
  limit?: number
  search?: string
  assetType?: string | string[]
  category?: string
  projectId?: string
  visibility?: string | string[]
  uploadedBy?: string
  tags?: string[]
  isFeatured?: boolean
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

// Hook for listing assets
export function useAssets(params: UseAssetsParams = {}) {
  return useQuery<AssetsListResponse, ApiErrorException>({
    queryKey: ["assets", params],
    queryFn: async () => {
      try {
        const response = await apiClient.get<AssetsListResponse>(
          "/api/assets",
          params
        )
        return response
      } catch (error) {
        if (error instanceof ApiErrorException) {
          throw error
        } else if (error instanceof Error) {
          throw new ApiErrorException(
            "UNKNOWN_ERROR",
            "An unexpected error occurred while fetching assets",
            { originalError: error.message },
            "Please try again later or contact support."
          )
        }
        throw error
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: (failureCount, error) => {
      if (
        error instanceof ApiErrorException &&
        ["VALIDATION_ERROR", "UNAUTHORIZED"].includes(error.code)
      ) {
        return false
      }
      return failureCount < 3
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
  })
}

// Hook for asset stats
export function useAssetStats() {
  return useQuery<AssetStatsResponse, ApiErrorException>({
    queryKey: ["assets", "stats"],
    queryFn: async () => {
      try {
        const response =
          await apiClient.get<AssetStatsResponse>("/api/assets/stats")
        return response
      } catch (error) {
        if (error instanceof ApiErrorException) {
          throw error
        } else if (error instanceof Error) {
          throw new ApiErrorException(
            "UNKNOWN_ERROR",
            "An unexpected error occurred while fetching asset stats",
            { originalError: error.message },
            "Please try again later or contact support."
          )
        }
        throw error
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Hook for asset operations
export function useAssetOperations() {
  const queryClient = useQueryClient()

  // Get single asset
  const useGetAsset = (assetId: string) =>
    useQuery<AssetResponse, ApiErrorException>({
      queryKey: ["asset", assetId],
      queryFn: async () => {
        try {
          const response = await apiClient.get<AssetResponse>(
            `/api/assets/${assetId}`
          )
          return response
        } catch (error) {
          if (error instanceof ApiErrorException) {
            throw error
          } else if (error instanceof Error) {
            throw new ApiErrorException(
              "UNKNOWN_ERROR",
              "An unexpected error occurred while fetching asset",
              { originalError: error.message },
              "Please try again later or contact support."
            )
          }
          throw error
        }
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      enabled: !!assetId,
    })

  // Create asset
  const createAsset = useMutation<
    AssetResponse,
    ApiErrorException,
    CreateAssetInput
  >({
    mutationFn: async (data) => {
      try {
        const response = await apiClient.post<AssetResponse>(
          "/api/assets/user",
          data
        )
        return response
      } catch (error) {
        if (error instanceof ApiErrorException) {
          throw error
        } else if (error instanceof Error) {
          throw new ApiErrorException(
            "UNKNOWN_ERROR",
            "An unexpected error occurred while creating asset",
            { originalError: error.message },
            "Please try again later or contact support."
          )
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] })
      queryClient.invalidateQueries({ queryKey: ["assets", "stats"] })
    },
  })

  // Update asset
  const updateAsset = async (assetId: string, data: UpdateAssetInput) => {
    try {
      const response = await apiClient.patch<AssetResponse>(
        `/api/assets/user/${assetId}`,
        data
      )
      queryClient.invalidateQueries({ queryKey: ["assets"] })
      queryClient.invalidateQueries({ queryKey: ["asset", assetId] })
      queryClient.invalidateQueries({ queryKey: ["assets", "stats"] })
      return response
    } catch (error) {
      if (error instanceof ApiErrorException) {
        throw error
      } else if (error instanceof Error) {
        throw new ApiErrorException(
          "UNKNOWN_ERROR",
          "An unexpected error occurred while updating asset",
          { originalError: error.message },
          "Please try again later or contact support."
        )
      }
      throw error
    }
  }

  // Delete asset
  const deleteAsset = async (assetId: string) => {
    try {
      const response = await apiClient.delete<{ success: boolean }>(
        `/api/assets/user/${assetId}`
      )
      queryClient.invalidateQueries({ queryKey: ["assets"] })
      queryClient.invalidateQueries({ queryKey: ["assets", "stats"] })
      return response
    } catch (error) {
      if (error instanceof ApiErrorException) {
        throw error
      } else if (error instanceof Error) {
        throw new ApiErrorException(
          "UNKNOWN_ERROR",
          "An unexpected error occurred while deleting asset",
          { originalError: error.message },
          "Please try again later or contact support."
        )
      }
      throw error
    }
  }

  // Update visibility
  const updateVisibility = async (
    assetId: string,
    visibility: "public" | "authenticated" | "committee" | "admin" | "private"
  ) => {
    try {
      const response = await apiClient.patch<AssetResponse>(
        `/api/assets/${assetId}/visibility`,
        { visibility }
      )
      queryClient.invalidateQueries({ queryKey: ["assets"] })
      queryClient.invalidateQueries({ queryKey: ["asset", assetId] })
      return response
    } catch (error) {
      if (error instanceof ApiErrorException) {
        throw error
      } else if (error instanceof Error) {
        throw new ApiErrorException(
          "UNKNOWN_ERROR",
          "An unexpected error occurred while updating visibility",
          { originalError: error.message },
          "Please try again later or contact support."
        )
      }
      throw error
    }
  }

  // Increment view count
  const incrementView = async (assetId: string) => {
    try {
      await apiClient.post(`/api/assets/${assetId}/view`, {})
    } catch (error) {
      // Silently fail for view tracking
      console.error("Failed to track view:", error)
    }
  }

  // Increment download count
  const incrementDownload = async (assetId: string) => {
    try {
      await apiClient.post(`/api/assets/${assetId}/download`, {})
    } catch (error) {
      // Silently fail for download tracking
      console.error("Failed to track download:", error)
    }
  }

  return {
    useGetAsset,
    createAsset,
    updateAsset,
    deleteAsset,
    updateVisibility,
    incrementView,
    incrementDownload,
  }
}

// Hook for project assets
export function useProjectAssets(projectId: string) {
  return useQuery<AssetsListResponse, ApiErrorException>({
    queryKey: ["assets", "project", projectId],
    queryFn: async () => {
      try {
        const response = await apiClient.get<AssetsListResponse>(
          `/api/project/${projectId}/assets`
        )
        return response
      } catch (error) {
        if (error instanceof ApiErrorException) {
          throw error
        } else if (error instanceof Error) {
          throw new ApiErrorException(
            "UNKNOWN_ERROR",
            "An unexpected error occurred while fetching project assets",
            { originalError: error.message },
            "Please try again later or contact support."
          )
        }
        throw error
      }
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!projectId,
  })
}

// ============================================
// USER-SPECIFIC HOOKS (for non-admin users)
// ============================================

// Hook for listing user's own assets
export function useUserAssets(params: UseAssetsParams = {}) {
  return useQuery<AssetsListResponse, ApiErrorException>({
    queryKey: ["user-assets", params],
    queryFn: async () => {
      try {
        const response = await apiClient.get<AssetsListResponse>(
          "/api/assets/user",
          params
        )
        return response
      } catch (error) {
        if (error instanceof ApiErrorException) {
          throw error
        } else if (error instanceof Error) {
          throw new ApiErrorException(
            "UNKNOWN_ERROR",
            "An unexpected error occurred while fetching your assets",
            { originalError: error.message },
            "Please try again later or contact support."
          )
        }
        throw error
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: (failureCount, error) => {
      if (
        error instanceof ApiErrorException &&
        ["VALIDATION_ERROR", "UNAUTHORIZED"].includes(error.code)
      ) {
        return false
      }
      return failureCount < 3
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
  })
}

// Hook for user's asset stats
export function useUserAssetStats() {
  return useQuery<AssetStatsResponse, ApiErrorException>({
    queryKey: ["user-assets", "stats"],
    queryFn: async () => {
      try {
        const response = await apiClient.get<AssetStatsResponse>(
          "/api/assets/user/stats"
        )
        return response
      } catch (error) {
        if (error instanceof ApiErrorException) {
          throw error
        } else if (error instanceof Error) {
          throw new ApiErrorException(
            "UNKNOWN_ERROR",
            "An unexpected error occurred while fetching your asset stats",
            { originalError: error.message },
            "Please try again later or contact support."
          )
        }
        throw error
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
