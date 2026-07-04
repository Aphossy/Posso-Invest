// C:\Users\user\OneDrive\Desktop\trustlink-group\lib\api-response.ts
import { createHash } from "crypto"
import { URL } from "url"
import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { generateRateLimitHeaders, type RateLimitResult } from "./rate-limiter"

export type ApiResponseMetadata = {
  requestId: string
  serverTimestamp: number | string
  processingTime: number
  serverTimeZone: string
  apiVersion: string
  requestMethod: string
  requestPath: string
  userAgent: string
  clientIp?: string
  environment: string
  serverName: string
  responseTime: string
  pagination?: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
  rateLimit?: {
    limit: number
    remaining: number
    reset: string
    retryAfter?: string
  }
  links?: {
    self?: string
    next?: string
    prev?: string
    first?: string
    last?: string
    documentation?: string
    [key: string]: string | undefined
  }
  etag?: string
  count?: number
}

export type ApiResponse<T = any> = {
  success: boolean
  data: T | null
  error: {
    code: string
    message: string
    details?: any
    help?: string
    validationErrors?: Array<{ path: string; message: string }>
  } | null
  metadata: ApiResponseMetadata
  message?: string
  warnings?: string[]
  debug?: any
}

/**
 * Generates ETag for response data
 */
function generateETag(data: any): string {
  return createHash("md5").update(JSON.stringify(data)).digest("hex")
}

/**
 * Adds CORS headers to support cross-origin requests from mobile app
 */
function addCorsHeaders(headers: Headers, request: NextRequest): void {
  const origin = request.headers.get("origin") || "*"

  // Allow requests from the mobile app and development servers
  const allowedOrigins = [
    "https://www.trustlink-group.rw",
    "https://trustlink-group.rw",
    "http://localhost:3000",
    "http://localhost:8081",
  ]

  // In development, allow all origins. In production, check against allowed list
  if (
    process.env.NODE_ENV === "development" ||
    allowedOrigins.includes(origin) ||
    origin.startsWith("exp://") || // Expo development
    origin.includes("trustlink-group") // Mobile app scheme
  ) {
    headers.set("Access-Control-Allow-Origin", origin === "*" ? "*" : origin)
    headers.set("Access-Control-Allow-Credentials", "true")
    headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    )
    headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, Cookie, X-Request-ID"
    )
    headers.set("Access-Control-Max-Age", "86400") // 24 hours
  }
}

/**
 * Handles CORS preflight OPTIONS requests
 */
export function corsPreflightResponse(
  request: NextRequest
): NextResponse<null> {
  const headers = new Headers()
  addCorsHeaders(headers, request)
  return new NextResponse(null, { status: 204, headers })
}

/**
 * Generates metadata for API responses
 */
function generateMetadata(
  request: NextRequest,
  startTime: number
): ApiResponseMetadata {
  const url = new URL(request.url)
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID()

  const now = performance.now()
  const processingTime = Math.round((now - startTime) * 100) / 100

  let responseTimeFormatted: string
  if (processingTime < 1) {
    responseTimeFormatted = `${Math.round(processingTime * 1000)}us`
  } else if (processingTime < 1000) {
    responseTimeFormatted = `${processingTime}ms`
  } else {
    responseTimeFormatted = `${(processingTime / 1000).toFixed(2)}s`
  }

  const protocol =
    request.headers.get("x-forwarded-proto") || url.protocol.slice(0, -1)
  const host = request.headers.get("x-forwarded-host") || url.host
  const baseUrl = `${protocol}://${host}`

  return {
    requestId,
    serverTimestamp: new Date().toISOString(),
    processingTime,
    serverTimeZone: process.env.TZ || "Africa/Kigali",
    apiVersion: process.env.API_VERSION || "v1",
    requestMethod: request.method,
    requestPath: url.pathname,
    userAgent: request.headers.get("user-agent") || "Unknown",
    clientIp:
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      undefined,
    environment: process.env.NODE_ENV || "development",
    serverName: process.env.SERVER_NAME || "NextJS-API",
    responseTime: responseTimeFormatted,
    links: {
      self: `${baseUrl}${url.pathname}${url.search}`,
      documentation: process.env.API_DOCS_URL
        ? `${process.env.API_DOCS_URL}${url.pathname}`
        : undefined,
    },
  }
}

/**
 * Validates input using Zod schema
 */
function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: any
): z.ZodSafeParseResult<T> {
  return schema.safeParse(data)
}

/**
 * Middleware to wrap API routes with consistent response formatting
 */
// lib/api-response.ts

export function withApiResponse<T>(
  handler: (
    req: NextRequest,
    context: { params: Promise<any> }, // Add context parameter
    validatedData?: any
  ) => Promise<T | NextResponse>,
  validationSchema?: z.ZodSchema<any>
) {
  return async (
    req: NextRequest,
    context: { params: Promise<any> } // Add context parameter here too
  ): Promise<NextResponse<ApiResponse<T>>> => {
    const startTime = performance.now()
    let validatedData: any = undefined

    try {
      // Validate input if schema is provided
      if (validationSchema && ["POST", "PUT", "PATCH"].includes(req.method)) {
        const body = await req.json()
        const validationResult = validateInput(validationSchema, body)
        if (!validationResult.success) {
          return validationErrorResponse(
            req,
            "Validation failed",
            {
              validationErrors: validationResult.error.issues.map((issue) => ({
                path: issue.path.join("."),
                message: issue.message,
              })),
            },
            { startTime }
          ) as NextResponse<ApiResponse<T>>
        }
        validatedData = validationResult.data
      }

      // Pass context to handler
      const result = await handler(req, context, validatedData)

      // If handler returns a NextResponse, return it directly
      if (result instanceof NextResponse) {
        return result as NextResponse<ApiResponse<T>>
      }

      // Generate ETag for the response data
      const etag = generateETag(result)

      // Check if response is cached
      const ifNoneMatch = req.headers.get("if-none-match")
      if (ifNoneMatch && ifNoneMatch === etag) {
        return new NextResponse(null, {
          status: 304,
          headers: {
            ETag: etag,
            "X-Request-ID": generateMetadata(req, startTime).requestId,
          },
        }) as NextResponse<ApiResponse<T>>
      }

      return successResponse(req, result, {
        startTime,
        cacheControl: "public, max-age=0, must-revalidate",
        metadata: { etag },
      })
    } catch (error: any) {
      return internalErrorResponse(req, error.message, {
        startTime,
        debug: process.env.NODE_ENV === "development" ? error.stack : undefined,
      }) as NextResponse<ApiResponse<T>>
    }
  }
}

/**
 * Creates a standardized successful API response for resource creation
 */
export function createdResponse<T>(
  request: NextRequest,
  data: T,
  options?: {
    statusCode?: number
    message?: string
    startTime?: number
    location?: string
    pagination?: ApiResponseMetadata["pagination"]
    warnings?: string[]
    debug?: any
    cacheControl?: string
    links?: Partial<ApiResponseMetadata["links"]>
    rateLimit?: RateLimitResult
    metadata?: Partial<ApiResponseMetadata>
  }
): NextResponse<ApiResponse<T>> {
  const startTime = options?.startTime || performance.now()
  const metadata = {
    ...generateMetadata(request, startTime),
    ...options?.metadata,
  }

  // Add rate limit information
  if (options?.rateLimit) {
    metadata.rateLimit = {
      limit: options.rateLimit.limit,
      remaining: options.rateLimit.remaining,
      reset: options.rateLimit.reset.toISOString(),
      retryAfter: options.rateLimit.retryAfter
        ? Math.ceil(
            (options.rateLimit.retryAfter.getTime() - Date.now()) / 1000
          ).toString()
        : undefined,
    }
  }

  // Add pagination metadata and links
  if (options?.pagination) {
    metadata.pagination = options.pagination
    const url = new URL(request.url)

    if (options.pagination.hasNextPage) {
      const nextUrl = new URL(url)
      nextUrl.searchParams.set("page", (options.pagination.page + 1).toString())
      metadata.links!.next = nextUrl.pathname + nextUrl.search
    }

    if (options.pagination.hasPreviousPage) {
      const prevUrl = new URL(url)
      prevUrl.searchParams.set("page", (options.pagination.page - 1).toString())
      metadata.links!.prev = prevUrl.pathname + prevUrl.search
    }

    const firstUrl = new URL(url)
    firstUrl.searchParams.set("page", "1")
    metadata.links!.first = firstUrl.pathname + firstUrl.search

    const lastUrl = new URL(url)
    lastUrl.searchParams.set("page", options.pagination.totalPages.toString())
    metadata.links!.last = lastUrl.pathname + lastUrl.search
  }

  if (options?.links) {
    metadata.links = { ...metadata.links, ...options.links }
  }

  const responseObject: ApiResponse<T> = {
    success: true,
    data,
    message: options?.message || "Resource created successfully",
    error: null,
    metadata,
  }

  if (options?.warnings && options.warnings.length > 0) {
    responseObject.warnings = options.warnings
  }

  if (process.env.NODE_ENV === "development" && options?.debug) {
    responseObject.debug = options.debug
  }

  const headers = new Headers({
    "X-Request-ID": metadata.requestId,
    "X-Response-Time": metadata.responseTime,
    ETag: options?.metadata?.etag || generateETag(data),
  })

  if (options?.location) {
    headers.set("Location", options.location)
  }

  if (options?.rateLimit) {
    const rateLimitHeaders = generateRateLimitHeaders(options.rateLimit)
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      if (value) headers.set(key, value)
    })
  }

  if (options?.cacheControl) {
    headers.set("Cache-Control", options.cacheControl)
  } else {
    headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private")
  }

  // Compression handled by Next.js automatically
  // Do not set Content-Encoding manually

  if (process.env.NODE_ENV === "development") {
    console.log({
      message: `API Created Response: ${request.method} ${metadata.requestPath} ${options?.statusCode || 201}`,
      requestId: metadata.requestId,
      method: request.method,
      path: metadata.requestPath,
      statusCode: options?.statusCode || 201,
      processingTime: metadata.processingTime,
      userMessage: options?.message,
    })
  }

  return NextResponse.json(responseObject, {
    status: options?.statusCode || 201,
    headers,
  })
}

/**
 * Creates a standardized successful API response
 */
export function successResponse<T>(
  request: NextRequest,
  data: T,
  options?: {
    statusCode?: number
    message?: string
    startTime?: number
    pagination?: ApiResponseMetadata["pagination"]
    warnings?: string[]
    debug?: any
    cacheControl?: string
    links?: Partial<ApiResponseMetadata["links"]>
    rateLimit?: RateLimitResult
    metadata?: Partial<ApiResponseMetadata>
  }
): NextResponse<ApiResponse<T>> {
  const startTime = options?.startTime || performance.now()
  const metadata = {
    ...generateMetadata(request, startTime),
    ...options?.metadata,
  }

  if (options?.rateLimit) {
    metadata.rateLimit = {
      limit: options.rateLimit.limit,
      remaining: options.rateLimit.remaining,
      reset: options.rateLimit.reset.toISOString(),
      retryAfter: options.rateLimit.retryAfter
        ? Math.ceil(
            (options.rateLimit.retryAfter.getTime() - Date.now()) / 1000
          ).toString()
        : undefined,
    }
  }

  if (options?.pagination) {
    metadata.pagination = options.pagination
    const url = new URL(request.url)

    if (options.pagination.hasNextPage) {
      const nextUrl = new URL(url)
      nextUrl.searchParams.set("page", (options.pagination.page + 1).toString())
      metadata.links!.next = nextUrl.pathname + nextUrl.search
    }

    if (options.pagination.hasPreviousPage) {
      const prevUrl = new URL(url)
      prevUrl.searchParams.set("page", (options.pagination.page - 1).toString())
      metadata.links!.prev = prevUrl.pathname + prevUrl.search
    }

    const firstUrl = new URL(url)
    firstUrl.searchParams.set("page", "1")
    metadata.links!.first = firstUrl.pathname + firstUrl.search

    const lastUrl = new URL(url)
    lastUrl.searchParams.set("page", options.pagination.totalPages.toString())
    metadata.links!.last = lastUrl.pathname + lastUrl.search
  }

  if (options?.links) {
    metadata.links = { ...metadata.links, ...options.links }
  }

  const responseObject: ApiResponse<T> = {
    success: true,
    data,
    message: options?.message,
    error: null,
    metadata,
  }

  if (options?.warnings && options.warnings.length > 0) {
    responseObject.warnings = options.warnings
  }

  if (process.env.NODE_ENV === "development" && options?.debug) {
    responseObject.debug = options.debug
  }

  const headers = new Headers({
    "X-Request-ID": metadata.requestId,
    "X-Response-Time": metadata.responseTime,
    ETag: options?.metadata?.etag || generateETag(data),
  })

  // Add CORS headers for cross-origin requests
  addCorsHeaders(headers, request)

  if (options?.rateLimit) {
    const rateLimitHeaders = generateRateLimitHeaders(options.rateLimit)
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      if (value) headers.set(key, value)
    })
  }

  if (options?.cacheControl) {
    headers.set("Cache-Control", options.cacheControl)
  } else {
    headers.set(
      "Cache-Control",
      "private, max-age=0, no-cache, no-store, must-revalidate"
    )
  }

  // Compression handled by Next.js automatically

  if (process.env.NODE_ENV === "development") {
    console.log({
      message: `API Response: ${request.method} ${metadata.requestPath} ${options?.statusCode || 200}`,
      requestId: metadata.requestId,
      method: request.method,
      path: metadata.requestPath,
      statusCode: options?.statusCode || 200,
      processingTime: metadata.processingTime,
      userMessage: options?.message,
    })
  }

  return NextResponse.json(responseObject, {
    status: options?.statusCode || 200,
    headers,
  })
}

/**
 * Creates a standardized error API response
 */
export function errorResponse(
  request: NextRequest,
  error: {
    code: string
    message: string
    details?: any
    help?: string
    validationErrors?: Array<{ path: string; message: string }>
  },
  options?: {
    statusCode?: number
    startTime?: number
    debug?: any
  }
): NextResponse<ApiResponse<null>> {
  const startTime = options?.startTime || performance.now()
  const metadata = generateMetadata(request, startTime)

  const responseObject: ApiResponse<null> = {
    success: false,
    data: null,
    error,
    metadata,
  }

  if (process.env.NODE_ENV === "development" && options?.debug) {
    responseObject.debug = options.debug
  }

  const headers = new Headers({
    "X-Request-ID": metadata.requestId,
    "X-Response-Time": metadata.responseTime,
  })

  // Add CORS headers for cross-origin requests
  addCorsHeaders(headers, request)

  // Compression handled by Next.js automatically

  if (process.env.NODE_ENV === "development") {
    console.error({
      message: `API Error: ${request.method} ${metadata.requestPath} ${options?.statusCode || 400} - ${error.code}: ${error.message}`,
      requestId: metadata.requestId,
      method: request.method,
      path: metadata.requestPath,
      statusCode: options?.statusCode || 400,
      errorCode: error.code,
      errorMessage: error.message,
      errorDetails: error.details,
      processingTime: metadata.processingTime,
    })
  }

  return NextResponse.json(responseObject, {
    status: options?.statusCode || 400,
    headers,
  })
}

/**
 * Error codes for standardized API errors
 */
export const ErrorCodes = {
  BAD_REQUEST: "BAD_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMITED: "RATE_LIMITED",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  CONFLICT: "CONFLICT",
  UNPROCESSABLE_ENTITY: "UNPROCESSABLE_ENTITY",
  PRECONDITION_FAILED: "PRECONDITION_FAILED",
  PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE",
  UNSUPPORTED_MEDIA_TYPE: "UNSUPPORTED_MEDIA_TYPE",
  TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",
  GATEWAY_TIMEOUT: "GATEWAY_TIMEOUT",
  DATABASE_ERROR: "DATABASE_ERROR",
  AUTHENTICATION_ERROR: "AUTHENTICATION_ERROR",
  AUTHORIZATION_ERROR: "AUTHORIZATION_ERROR",
  RESOURCE_EXISTS: "RESOURCE_EXISTS",
  RESOURCE_GONE: "RESOURCE_GONE",
  BUSINESS_LOGIC_ERROR: "BUSINESS_LOGIC_ERROR",
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",
} as const

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]

/**
 * Common error response helpers
 */
export function badRequestResponse(
  request: NextRequest,
  message: string,
  details?: any,
  options?: {
    help?: string
    startTime?: number
    debug?: any
  }
): NextResponse<ApiResponse<null>> {
  return errorResponse(
    request,
    {
      code: ErrorCodes.BAD_REQUEST,
      message,
      details,
      help: options?.help,
    },
    {
      statusCode: 400,
      startTime: options?.startTime,
      debug: options?.debug,
    }
  )
}

export function unauthorizedResponse(
  request: NextRequest,
  message = "Unauthorized",
  options?: {
    help?: string
    startTime?: number
    debug?: any
  }
): NextResponse<ApiResponse<null>> {
  return errorResponse(
    request,
    {
      code: ErrorCodes.UNAUTHORIZED,
      message,
      help: options?.help || "Please provide valid authentication credentials.",
    },
    {
      statusCode: 401,
      startTime: options?.startTime,
      debug: options?.debug,
    }
  )
}

export function forbiddenResponse(
  request: NextRequest,
  message = "Forbidden",
  options?: {
    help?: string
    startTime?: number
    debug?: any
  }
): NextResponse<ApiResponse<null>> {
  return errorResponse(
    request,
    {
      code: ErrorCodes.FORBIDDEN,
      message,
      help:
        options?.help || "You don't have permission to access this resource.",
    },
    {
      statusCode: 403,
      startTime: options?.startTime,
      debug: options?.debug,
    }
  )
}

export function notFoundResponse(
  request: NextRequest,
  message = "Resource not found",
  options?: {
    help?: string
    startTime?: number
    debug?: any
  }
): NextResponse<ApiResponse<null>> {
  return errorResponse(
    request,
    {
      code: ErrorCodes.NOT_FOUND,
      message,
      help: options?.help || "The requested resource could not be found.",
    },
    {
      statusCode: 404,
      startTime: options?.startTime,
      debug: options?.debug,
    }
  )
}

export function conflictResponse(
  request: NextRequest,
  message: string,
  details?: any,
  options?: {
    help?: string
    startTime?: number
    debug?: any
  }
): NextResponse<ApiResponse<null>> {
  return errorResponse(
    request,
    {
      code: ErrorCodes.CONFLICT,
      message,
      details,
      help:
        options?.help ||
        "The request conflicts with the current state of the resource.",
    },
    {
      statusCode: 409,
      startTime: options?.startTime,
      debug: options?.debug,
    }
  )
}

export function validationErrorResponse(
  request: NextRequest,
  message: string,
  details?: {
    validationErrors?: Array<{ path: string; message: string }>
    [key: string]: any
  },
  options?: {
    help?: string
    startTime?: number
    debug?: any
  }
): NextResponse<ApiResponse<null>> {
  return errorResponse(
    request,
    {
      code: ErrorCodes.VALIDATION_ERROR,
      message,
      details: details?.validationErrors ? undefined : details,
      validationErrors: details?.validationErrors,
      help: options?.help || "Please check your input and try again.",
    },
    {
      statusCode: 422,
      startTime: options?.startTime,
      debug: options?.debug,
    }
  )
}

export function rateLimitedResponse(
  request: NextRequest,
  rateLimitResult: RateLimitResult,
  options?: {
    message?: string
    help?: string
    startTime?: number
    debug?: any
  }
): NextResponse<ApiResponse<null>> {
  const startTime = options?.startTime || performance.now()
  const metadata = generateMetadata(request, startTime)

  metadata.rateLimit = {
    limit: rateLimitResult.limit,
    remaining: rateLimitResult.remaining,
    reset: rateLimitResult.reset.toISOString(),
    retryAfter: rateLimitResult.retryAfter
      ? Math.ceil(
          (rateLimitResult.retryAfter.getTime() - Date.now()) / 1000
        ).toString()
      : undefined,
  }

  const message = options?.message || "Too many requests"
  const retryAfter = rateLimitResult.retryAfter
    ? Math.ceil((rateLimitResult.retryAfter.getTime() - Date.now()) / 1000)
    : undefined

  const responseObject: ApiResponse<null> = {
    success: false,
    data: null,
    error: {
      code: ErrorCodes.TOO_MANY_REQUESTS,
      message,
      details: {
        limit: rateLimitResult.limit,
        remaining: rateLimitResult.remaining,
        reset: rateLimitResult.reset.toISOString(),
        retryAfter,
      },
      help:
        options?.help ||
        `Rate limit exceeded. Please try again later. ${retryAfter ? `You can retry after ${retryAfter} seconds.` : ""}`,
    },
    metadata,
  }

  if (process.env.NODE_ENV === "development" && options?.debug) {
    responseObject.debug = options.debug
  }

  const rateLimitHeaders = generateRateLimitHeaders(rateLimitResult)
  const headers = new Headers({
    "X-Request-ID": metadata.requestId,
    "X-Response-Time": metadata.responseTime,
    ...rateLimitHeaders,
  })

  if (process.env.NODE_ENV === "development") {
    console.error({
      message: `API Rate Limited: ${request.method} ${metadata.requestPath} 429 - ${message}`,
      requestId: metadata.requestId,
      method: request.method,
      path: metadata.requestPath,
      statusCode: 429,
      rateLimit: {
        limit: rateLimitResult.limit,
        remaining: rateLimitResult.remaining,
        reset: rateLimitResult.reset.toISOString(),
        retryAfter,
      },
      processingTime: metadata.processingTime,
    })
  }

  return NextResponse.json(responseObject, {
    status: 429,
    headers,
  })
}

export function internalErrorResponse(
  request: NextRequest,
  message = "Internal server error",
  options?: {
    help?: string
    startTime?: number
    debug?: any
  }
): NextResponse<ApiResponse<null>> {
  return errorResponse(
    request,
    {
      code: ErrorCodes.INTERNAL_ERROR,
      message,
      help:
        options?.help ||
        "An unexpected error occurred. Our team has been notified.",
    },
    {
      statusCode: 500,
      startTime: options?.startTime,
      debug: options?.debug,
    }
  )
}

export function serviceUnavailableResponse(
  request: NextRequest,
  message = "Service unavailable",
  options?: {
    help?: string
    retryAfter?: number
    startTime?: number
    debug?: any
  }
): NextResponse<ApiResponse<null>> {
  const response = errorResponse(
    request,
    {
      code: ErrorCodes.SERVICE_UNAVAILABLE,
      message,
      help:
        options?.help ||
        "The service is temporarily unavailable. Please try again later.",
    },
    {
      statusCode: 503,
      startTime: options?.startTime,
      debug: options?.debug,
    }
  )

  if (options?.retryAfter) {
    response.headers.set("Retry-After", options.retryAfter.toString())
  }

  return response
}

export function databaseErrorResponse(
  request: NextRequest,
  message = "Database operation failed",
  details?: any,
  options?: {
    help?: string
    startTime?: number
    debug?: any
  }
): NextResponse<ApiResponse<null>> {
  return errorResponse(
    request,
    {
      code: ErrorCodes.DATABASE_ERROR,
      message,
      details: process.env.NODE_ENV === "production" ? undefined : details,
      help: options?.help || "There was an issue with the database operation.",
    },
    {
      statusCode: 500,
      startTime: options?.startTime,
      debug: options?.debug,
    }
  )
}

export function businessLogicErrorResponse(
  request: NextRequest,
  message: string,
  details?: any,
  options?: {
    help?: string
    startTime?: number
    debug?: any
  }
): NextResponse<ApiResponse<null>> {
  return errorResponse(
    request,
    {
      code: ErrorCodes.BUSINESS_LOGIC_ERROR,
      message,
      details,
      help: options?.help,
    },
    {
      statusCode: 422,
      startTime: options?.startTime,
      debug: options?.debug,
    }
  )
}
