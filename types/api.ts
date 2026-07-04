/**
 * API Types and Error Handling
 */

export class ApiErrorException extends Error {
  code: string
  details: Record<string, any>
  userMessage?: string
  error?: any
  statusCode?: number
  help?: string
  rateLimit?: {
    limit: number
    remaining: number
    reset: string
    retryAfter: number
  }

  constructor(
    code: string,
    message: string,
    details: Record<string, any> = {},
    help?: string
  ) {
    super(message)
    this.name = "ApiErrorException"
    this.code = code
    this.details = details
    this.help = help

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiErrorException)
    }
  }
}

export interface ApiResponse<T = any> {
  success: boolean
  data: T | null
  message?: string
  error: {
    code: string
    message: string
    details?: Record<string, any>
    help?: string
  } | null

  metadata: {
    requestId: string
    serverTimestamp: string
    processingTime: number
    [key: string]: any
  }
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface ApiErrorResponse {
  success: false
  data: null
  error: {
    code: string
    message: string
    details?: {
      [key: string]: string[]
    }
    validationErrors?: Array<{
      path: string
      message: string
    }>
    help?: string
  }
  metadata: {
    requestId: string
    serverTimestamp: string
    processingTime: number
    serverTimeZone: string
    apiVersion: string
    requestMethod: string
    requestPath: string
    userAgent: string
    clientIp: string
    environment: string
    serverName: string
    responseTime: string
    links: {
      self: string
      [key: string]: string
    }
    rateLimit?: {
      limit: number
      remaining: number
      reset: string
      retryAfter?: string
    }
  }
}
