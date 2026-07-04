// middleware.ts
import { NextRequest, NextResponse } from "next/server"
import {
  extractRoleValue,
  getRoleDashboard,
  roleRoutes,
} from "@/utils/role-utils"

import { auth } from "@/lib/auth"

// Helper to check if user has access to the requested path
async function resolveActiveMemberRole(
  headersList: Headers
): Promise<string | null> {
  try {
    const orgApi = (auth.api as any).organization
    if (!orgApi?.getActiveMemberRole) {
      return null
    }
    const roleResponse = await orgApi.getActiveMemberRole({
      headers: headersList,
    })
    return extractRoleValue(roleResponse)
  } catch (error) {
    return null
  }
}

function hasRoleAccess(role: string, pathname: string): boolean {
  const allowedPrefixes = roleRoutes[role] || []
  return allowedPrefixes.some((prefix) => pathname.startsWith(prefix))
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  // ============================================
  // CORS Handling for API Routes
  // ============================================
  if (pathname.startsWith("/api")) {
    // Get the origin from the request
    const origin = request.headers.get("origin") || ""

    // List of allowed origins
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000", // Your Next.js app
      // Add more origins as needed for production
    ]

    // Check if the origin is allowed
    const isAllowedOrigin = allowedOrigins.some(
      (allowedOrigin) => origin === allowedOrigin || origin.startsWith("exp://")
    )

    // Handle preflight OPTIONS request
    if (request.method === "OPTIONS") {
      const response = new NextResponse(null, { status: 204 })

      if (isAllowedOrigin) {
        response.headers.set("Access-Control-Allow-Origin", origin)
      }
      response.headers.set("Access-Control-Allow-Credentials", "true")
      response.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS"
      )
      response.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Requested-With, Accept, Origin"
      )
      response.headers.set("Access-Control-Max-Age", "86400") // 24 hours

      return response
    }

    // if (pathname === "/api/auth/organization/get-full-organization") {
    //   const session = await auth.api.getSession({
    //     headers: request.headers,
    //   })
    //   const role = await resolveActiveMemberRole(request.headers)

    //   if (!session?.user || role !== "admin") {
    //     const response = new NextResponse(
    //       JSON.stringify({
    //         success: false,
    //         data: null,
    //         error: {
    //           code: "FORBIDDEN",
    //           message: "You are not allowed to access this resource.",
    //           help: "Ask an admin if you need organization details.",
    //         },
    //       }),
    //       { status: 403 }
    //     )

    //     response.headers.set("Content-Type", "application/json")

    //     if (isAllowedOrigin) {
    //       response.headers.set("Access-Control-Allow-Origin", origin)
    //     }
    //     response.headers.set("Access-Control-Allow-Credentials", "true")
    //     response.headers.set(
    //       "Access-Control-Allow-Methods",
    //       "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    //     )
    //     response.headers.set(
    //       "Access-Control-Allow-Headers",
    //       "Content-Type, Authorization, X-Requested-With, Accept, Origin"
    //     )

    //     return response
    //   }
    // }

    // Handle actual API request with CORS headers
    const response = NextResponse.next()

    if (isAllowedOrigin) {
      response.headers.set("Access-Control-Allow-Origin", origin)
    }
    response.headers.set("Access-Control-Allow-Credentials", "true")
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    )
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With, Accept, Origin"
    )

    return response
  }

  // ============================================
  // Authentication & Authorization for Dashboard Routes
  // ============================================

  // Get session
  const headersList = request.headers
  const session = await auth.api.getSession({ headers: headersList })

  // Redirect to login if no session, preserving the original URL
  if (!session) {
    if (pathname === "/login") {
      return NextResponse.next()
    }
    const loginUrl = new URL("/login", request.url)
    // Capture the full path including search params
    const from = pathname + search
    loginUrl.searchParams.set("from", from)
    return NextResponse.redirect(loginUrl)
  }

  // Extract role from session
  const activeMemberRole = await resolveActiveMemberRole(headersList)
  const userRole = extractRoleValue(activeMemberRole)

  if (!userRole) {
    return NextResponse.next()
  }

  if (pathname === "/login") {
    const roleDashboard = getRoleDashboard(userRole)
    return NextResponse.redirect(new URL(roleDashboard, request.url))
  }

  // Handle /dashboard route - redirect to role-specific dashboard
  if (pathname === "/dashboard") {
    const roleDashboard = getRoleDashboard(userRole)
    return NextResponse.redirect(new URL(roleDashboard, request.url))
  }

  // Check if user has access to the requested route
  if (!hasRoleAccess(userRole, pathname)) {
    // Redirect to their appropriate dashboard
    const roleDashboard = getRoleDashboard(userRole)
    return NextResponse.redirect(new URL(roleDashboard, request.url))
  }

  // Allow access
  return NextResponse.next()
}

export const config = {
  matcher: [
    "/api/:path*", // Handle CORS for API routes
    "/login",
    "/redirect",
    "/dashboard/:path*",
    "/admin/:path*",
    "/president/:path*",
    "/treasurer/:path*",
    "/secretary/:path*",
    "/member/:path*",
  ],
}
