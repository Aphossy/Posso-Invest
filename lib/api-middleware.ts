// lC:\Users\user\OneDrive\Desktop\trustlink-group\lib\api-middleware.ts
import { createHash } from "crypto"
import type { NextRequest, NextResponse } from "next/server"
import logger from "@/utils/logger"

import { ApiResponse } from "@/lib/api-response"

export interface PaginationInfo {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

/**
 * Middleware to add start time to track processing time
 */
export function withTiming() {
  return {
    startTime: performance.now(),
  }
}

/**
 * Generates ETag for response data
 */
export function generateETag(data: any): string {
  return createHash("md5").update(JSON.stringify(data)).digest("hex")
}

/**
 * Middleware to generate and attach request ID
 */
export function withRequestId() {
  return {
    requestId: crypto.randomUUID(),
  }
}

/**
 * Middleware to enable response compression
 */
export function withCompression() {
  return {
    compression: true,
    headers: {
      "Content-Encoding": "gzip",
    },
  }
}

/**
 * Middleware to log requests
 */
export function withRequestLogging<T>(
  handler: (
    req: NextRequest,
    context: { params: Promise<any> }
  ) => Promise<NextResponse<ApiResponse<T>>>
) {
  return async (
    req: NextRequest,
    context: { params: Promise<any> }
  ): Promise<NextResponse<ApiResponse<T>>> => {
    const { startTime } = withTiming()
    const { requestId } = withRequestId()

    const logData = {
      requestId,
      method: req.method,
      path: new URL(req.url).pathname,
      userAgent: req.headers.get("user-agent") || "Unknown",
      clientIp:
        req.headers.get("x-forwarded-for")?.split(",")[0] ||
        req.headers.get("x-real-ip") ||
        "Unknown",
      timestamp: new Date().toISOString(),
    }

    logger.info("API Request", logData)

    try {
      const response = await handler(req, context)

      const processingTime =
        Math.round((performance.now() - startTime) * 100) / 100
      logger.info("API Response", {
        ...logData,
        statusCode: response.status,
        processingTime,
      })

      // Add request ID to response headers
      response.headers.set("X-Request-ID", requestId)

      return response
    } catch (error: any) {
      logger.error("API Request Error", {
        ...logData,
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      })
      throw error
    }
  }
}

/**
 * Extract pagination parameters from request
 */
export function extractPagination(request: NextRequest) {
  const url = new URL(request.url)
  const page = Number.parseInt(url.searchParams.get("page") || "1", 10)
  const pageSize = Number.parseInt(url.searchParams.get("limit") || "10", 10) // Changed to 'limit'
  const offset = (page - 1) * pageSize

  return {
    page: Math.max(1, page),
    pageSize: Math.min(100, Math.max(1, pageSize)),
    offset,
  }
}

/**
 * Calculate pagination metadata
 */
export function calculatePagination(
  page: number,
  pageSize: number,
  totalItems: number
): PaginationInfo {
  const totalPages = Math.ceil(totalItems / pageSize)

  return {
    page,
    pageSize,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  }
}

/**
 * Generate HATEOAS links for common operations
 */
export function generateLinks(
  request: NextRequest,
  pagination?: PaginationInfo,
  additionalLinks?: Record<string, string>,
  resourceId?: string,
  customLinks?: Record<string, string>
) {
  const url = new URL(request.url)
  const protocol =
    request.headers.get("x-forwarded-proto") || url.protocol.slice(0, -1)
  const host = request.headers.get("x-forwarded-host") || url.host
  const baseUrl = `${protocol}://${host}`
  const basePath = url.pathname

  const links: Record<string, string> = {
    self: `${baseUrl}${basePath}${url.search}`,
    ...customLinks,
    ...additionalLinks,
  }

  if (resourceId) {
    links.view = `${baseUrl}${basePath}/${resourceId}`
    links.update = `${baseUrl}${basePath}/${resourceId}`
    links.delete = `${baseUrl}${basePath}/${resourceId}`
  }

  if (pagination) {
    if (pagination.hasNextPage) {
      const nextUrl = new URL(url)
      nextUrl.searchParams.set("page", (pagination.page + 1).toString())
      links.next = nextUrl.pathname + nextUrl.search
    }

    if (pagination.hasPreviousPage) {
      const prevUrl = new URL(url)
      prevUrl.searchParams.set("page", (pagination.page - 1).toString())
      links.prev = prevUrl.pathname + prevUrl.search
    }

    const firstUrl = new URL(url)
    firstUrl.searchParams.set("page", "1")
    links.first = firstUrl.pathname + firstUrl.search

    const lastUrl = new URL(url)
    lastUrl.searchParams.set("page", pagination.totalPages.toString())
    links.last = lastUrl.pathname + lastUrl.search
  }

  return links
}

/**
 * Validate pagination parameters
 */
export function validatePaginationParams(page: number, pageSize: number) {
  const errors: string[] = []

  if (page < 1) {
    errors.push("Page must be greater than 0")
  }

  if (pageSize < 1) {
    errors.push("Page size must be greater than 0")
  }

  if (pageSize > 100) {
    errors.push("Page size cannot exceed 100")
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}
