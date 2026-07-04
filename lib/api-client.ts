// lib/api-client.ts (Fixed to return plain JSON)
import { ApiErrorException } from "@/types/api"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ""
interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl = "") {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { params, ...fetchOptions } = options

    // Build URL with query parameters
    let url = `${this.baseUrl}${endpoint}`
    if (params) {
      const searchParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value))
        }
      })
      const queryString = searchParams.toString()
      if (queryString) {
        url += `?${queryString}`
      }
    }

    try {
      const isGet = (fetchOptions.method || "GET").toUpperCase() === "GET"
      const response = await fetch(url, {
        // Prevent browser/edge/CDN caching so mutations reflect immediately
        cache: isGet ? "no-store" : undefined,
        ...fetchOptions,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          ...fetchOptions.headers,
        },
      })

      // Handle empty responses (e.g., from DELETE endpoints)
      const contentLength = response.headers.get("content-length")
      const contentType = response.headers.get("content-type")
      let data: any

      if (contentLength === "0" || !contentType?.includes("application/json")) {
        // For empty responses, create a default success response
        data = response.ok
          ? { success: true, data: null, message: "Operation successful" }
          : { success: false, error: { message: response.statusText } }
      } else {
        data = await response.json()
      }

      // Handle error responses
      if (!response.ok || !data.success) {
        const errorData = data.error || {}
        throw new ApiErrorException(
          errorData.code || "UNKNOWN_ERROR",
          errorData.message || "An unexpected error occurred",
          errorData.details || {},
          errorData.help
        )
      }

      return data
    } catch (error) {
      if (error instanceof ApiErrorException) {
        throw error
      }

      // Handle network errors or other unexpected errors
      if (error instanceof Error) {
        throw new ApiErrorException(
          "NETWORK_ERROR",
          error.message || "Network request failed",
          { originalError: error.message },
          "Please check your internet connection and try again."
        )
      }

      throw new ApiErrorException(
        "UNKNOWN_ERROR",
        "An unexpected error occurred",
        {},
        "Please try again later."
      )
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    return this.request<T>(endpoint, { method: "GET", params })
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: JSON.stringify(data),
    })
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" })
  }
}

// Export a singleton instance
export const apiClient = new ApiClient()
