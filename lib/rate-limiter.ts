// lib\rate-limiter.ts
import { headers } from "next/headers"
import { after } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: Date
  retryAfter?: Date
  pending?: Promise<any>
}

export interface RateLimitOptions {
  algorithm?: "sliding-window" | "fixed-window" | "token-bucket"
  analytics?: boolean
  prefix?: string
}

// Additional type for API response integration
export interface RateLimitHeaders {
  "X-RateLimit-Limit": string
  "X-RateLimit-Remaining": string
  "X-RateLimit-Reset": string
  "Retry-After"?: string
}

// Create Redis instance (guarded)
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN
let redis: Redis | null = null
let upstashAvailable = false

if (UPSTASH_URL && UPSTASH_TOKEN) {
  try {
    redis = new Redis({ url: UPSTASH_URL, token: UPSTASH_TOKEN })
    upstashAvailable = true
  } catch (err) {
    console.warn("Upstash Redis initialization failed, falling back to no-op rate limiter", err)
    redis = null
    upstashAvailable = false
  }
} else {
  console.warn("UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set — rate limiting disabled")
}

export async function rateLimit(
  key: string,
  limit: number,
  duration: number, // in seconds
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  const {
    algorithm = "sliding-window",
    analytics = true,
    prefix = "@upstash/ratelimit",
  } = options

  const headersList = await headers()
  const ip =
    headersList.get("x-forwarded-for") ??
    headersList.get("x-real-ip") ??
    "unknown"

  // Generate a SHA-256 hash for the IP address
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(ip)
  )
  const hash = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")

  const identifier = `${key}:${hash}`

  // If Upstash is not available, return a permissive result so
  // feature routes continue to work instead of throwing errors.
  if (!upstashAvailable || !redis) {
    const resetDate = new Date(Date.now() + duration * 1000)
    return {
      success: true,
      limit,
      remaining: limit,
      reset: resetDate,
    }
  }

  // Choose the appropriate limiter algorithm
  let limiter
  const durationString = `${duration}s` as const // Remove space for proper Duration format

  switch (algorithm) {
    case "fixed-window":
      limiter = Ratelimit.fixedWindow(limit, durationString)
      break
    case "token-bucket":
      limiter = Ratelimit.tokenBucket(limit, durationString, limit)
      break
    case "sliding-window":
    default:
      limiter = Ratelimit.slidingWindow(limit, durationString)
      break
  }

  // Create ratelimiter instance
  const ratelimit = new Ratelimit({
    redis,
    limiter,
    prefix,
    analytics,
  })

  try {
    const {
      success,
      limit: rateLimitLimit,
      remaining,
      reset,
      pending,
    } = await ratelimit.limit(identifier)

    // Handle analytics promise if analytics is enabled
    if (analytics && pending) {
      // Use after if available (Next.js), otherwise handle the promise
      if (typeof after === "function") {
        after(pending)
      } else {
        // Handle the promise without blocking
        pending.catch((error) => {
          console.warn("Analytics submission failed:", error)
        })
      }
    }

    const resetDate = new Date(reset)
    const retryAfterDate = success ? undefined : resetDate

    return {
      success,
      limit: rateLimitLimit,
      remaining,
      reset: resetDate,
      retryAfter: retryAfterDate,
      pending: analytics ? pending : undefined,
    }
  } catch (error) {
    console.error("Rate limiting error:", error)
    throw new Error("Failed to execute rate limiting")
  }
}

// Helper function for multiple rate limits (applies all limits sequentially)
export async function multiRateLimit(
  key: string,
  limits: Array<{
    limit: number
    duration: number
    algorithm?: "sliding-window" | "fixed-window" | "token-bucket"
  }>,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  const { analytics = true, prefix = "@upstash/ratelimit" } = options

  const headersList = await headers()
  const ip =
    headersList.get("x-forwarded-for") ??
    headersList.get("x-real-ip") ??
    "unknown"

  // Generate a SHA-256 hash for the IP address
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(ip)
  )
  const hash = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")

  const identifier = `${key}:${hash}`

  // If Upstash is not available, always succeed quickly
  if (!upstashAvailable || !redis) {
    const resetDate = new Date(Date.now() + (limits[limits.length - 1]?.duration ?? 60) * 1000)
    return {
      success: true,
      limit: limits[limits.length - 1]?.limit ?? 0,
      remaining: limits[limits.length - 1]?.limit ?? 0,
      reset: resetDate,
    }
  }

  // Check each rate limit sequentially
  for (let i = 0; i < limits.length; i++) {
    const { limit, duration, algorithm = "sliding-window" } = limits[i]
    const durationString = `${duration}s` as const

    let limiter
    switch (algorithm) {
      case "fixed-window":
        limiter = Ratelimit.fixedWindow(limit, durationString)
        break
      case "token-bucket":
        limiter = Ratelimit.tokenBucket(limit, durationString, limit)
        break
      case "sliding-window":
      default:
        limiter = Ratelimit.slidingWindow(limit, durationString)
        break
    }

    // Create ratelimiter instance for this specific limit
    const ratelimit = new Ratelimit({
      redis,
      limiter,
      prefix: `${prefix}:${i}`, // Different prefix for each limit
      analytics,
    })

    try {
      const {
        success,
        limit: rateLimitLimit,
        remaining,
        reset,
        pending,
      } = await ratelimit.limit(identifier)

      // If any rate limit fails, return the failure
      if (!success) {
        // Handle analytics promise if analytics is enabled
        if (analytics && pending) {
          if (typeof after === "function") {
            after(pending)
          } else {
            pending.catch((error) => {
              console.warn("Analytics submission failed:", error)
            })
          }
        }

        const resetDate = new Date(reset)
        return {
          success: false,
          limit: rateLimitLimit,
          remaining,
          reset: resetDate,
          retryAfter: resetDate,
          pending: analytics ? pending : undefined,
        }
      }

      // Handle analytics promise for successful requests
      if (analytics && pending) {
        if (typeof after === "function") {
          after(pending)
        } else {
          pending.catch((error) => {
            console.warn("Analytics submission failed:", error)
          })
        }
      }

      // If this is the last limit and all passed, return success
      if (i === limits.length - 1) {
        const resetDate = new Date(reset)
        return {
          success: true,
          limit: rateLimitLimit,
          remaining,
          reset: resetDate,
          pending: analytics ? pending : undefined,
        }
      }
    } catch (error) {
      console.error(`Multi rate limiting error at index ${i}:`, error)
      throw new Error("Failed to execute multi rate limiting")
    }
  }

  // This should never be reached, but TypeScript needs it
  throw new Error("No rate limits provided")
}

// Convenience functions for common use cases
export const createApiRateLimit =
  (limit: number = 100, duration: number = 3600) =>
  async (key: string) =>
    rateLimit(`api:${key}`, limit, duration)

export const createUserRateLimit =
  (limit: number = 10, duration: number = 60) =>
  async (key: string) =>
    rateLimit(`user:${key}`, limit, duration)

export const createGlobalRateLimit =
  (limit: number = 1000, duration: number = 3600) =>
  async (key: string) =>
    rateLimit(`global:${key}`, limit, duration)

// Helper function to generate rate limit headers
export function generateRateLimitHeaders(
  result: RateLimitResult
): RateLimitHeaders {
  const headers: RateLimitHeaders = {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": result.reset.toISOString(),
  }

  if (result.retryAfter) {
    headers["Retry-After"] = Math.ceil(
      (result.retryAfter.getTime() - Date.now()) / 1000
    ).toString()
  }

  return headers
}
