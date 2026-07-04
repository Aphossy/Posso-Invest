import { NextResponse } from "next/server"
import { toNextJsHandler } from "better-auth/next-js"

import { auth } from "@/lib/auth"

// Create the handlers
const handlers = toNextJsHandler(auth)

// Security: Verify request is from trusted source
function isRequestFromTrustedSource(request: Request): boolean {
  const origin = request.headers.get("origin")
  const referer = request.headers.get("referer")
  const expoOrigin = request.headers.get("expo-origin")
  const userAgent = request.headers.get("user-agent") || ""

  // Allow requests from:
  // 1. Your production domain
  const trustedDomains = [
    "https://www.trustlink-group.rw",
    "https://trustlink-group.rw",
    "http://localhost:3000",
    "http://localhost:8081",
  ]

  if (origin && trustedDomains.some((domain) => origin.startsWith(domain))) {
    return true
  }

  if (referer && trustedDomains.some((domain) => referer.startsWith(domain))) {
    return true
  }

  // 2. Expo mobile app (has expo-origin header or expo user-agent)
  if (
    expoOrigin ||
    userAgent.includes("Expo") ||
    userAgent.includes("okhttp")
  ) {
    return true
  }

  // 3. Development: Allow exp:// origins
  if (process.env.NODE_ENV === "development") {
    if (origin?.includes("exp://") || referer?.includes("exp://")) {
      return true
    }
  }

  return false
}

// Handle OPTIONS preflight requests
export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin") || "http://localhost:8081"

  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, Cookie, X-Better-Auth, Origin, Referer, Expo-Origin",
      "Access-Control-Max-Age": "86400",
    },
  })
}

function isGetActiveMemberRoleRequest(request: Request): boolean {
  const url = new URL(request.url)
  return url.pathname.endsWith("/organization/get-active-member-role")
}

function createFallbackRoleResponse(origin: string) {
  const response = new NextResponse(
    JSON.stringify({
      role: "member",
      status: "fallback",
      warning: "member schema incomplete",
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    }
  )

  response.headers.set("Access-Control-Allow-Origin", origin)
  response.headers.set("Access-Control-Allow-Credentials", "true")
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  )
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Cookie, X-Better-Auth, Origin, Referer, Expo-Origin"
  )
  response.headers.set("Access-Control-Expose-Headers", "Set-Cookie")

  return response
}

async function handleAuthRequest(
  request: Request,
  handler: (req: Request) => Promise<Response>
) {
  const origin =
    request.headers.get("origin") ||
    request.headers.get("referer") ||
    "http://localhost:8081"
  const isFallbackEndpoint = isGetActiveMemberRoleRequest(request)

  try {
    const response = await handler(request)

    if (isFallbackEndpoint && response.status >= 500) {
      return createFallbackRoleResponse(origin)
    }

    const newHeaders = new Headers(response.headers)
    newHeaders.set("Access-Control-Allow-Origin", origin)
    newHeaders.set("Access-Control-Allow-Credentials", "true")
    newHeaders.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    )
    newHeaders.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, Cookie, X-Better-Auth, Origin, Referer, Expo-Origin"
    )
    newHeaders.set("Access-Control-Expose-Headers", "Set-Cookie")

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Authentication request failed"

    console.error("[api/auth] Auth handler failed", {
      path: new URL(request.url).pathname,
      method: request.method,
      error: message,
    })

    if (isFallbackEndpoint) {
      return createFallbackRoleResponse(origin)
    }

    return new NextResponse(
      JSON.stringify({
        success: false,
        error: {
          code: "AUTH_INTERNAL_ERROR",
          message: "Authentication is temporarily unavailable. Please try again.",
        },
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers":
            "Content-Type, Authorization, Cookie, X-Better-Auth, Origin, Referer, Expo-Origin",
        },
      }
    )
  }
}

// POST handler - pass through with CORS headers and security check
export async function POST(request: Request) {
  // console.log("[api/auth] POST called", {
  //   url: request.url,
  //   method: request.method,
  //   headers: Object.fromEntries(request.headers.entries()),
  // })

  // Security check (optional - can be removed if too restrictive)
  // Uncomment if you want extra security validation
  // if (!isRequestFromTrustedSource(request)) {
  //   console.warn("[api/auth] Request from untrusted source rejected")
  //   return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
  //     status: 401,
  //     headers: { "Content-Type": "application/json" },
  //   })
  // }

  return handleAuthRequest(request, handlers.POST)
}

// GET handler - pass through with CORS headers
export async function GET(request: Request) {
  // console.log("[api/auth] GET called", {
  //   url: request.url,
  //   method: request.method,
  //   headers: Object.fromEntries(request.headers.entries()),
  // })

  return handleAuthRequest(request, handlers.GET)
}
