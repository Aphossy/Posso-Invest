// app\api\authentication\change-password\route.ts
import { headers } from "next/headers"
import { APIError } from "better-auth"

import { auth } from "@/lib/auth"
import { passwordFormSchema } from "@/lib/validators/auth-validators"

export async function POST(request: Request) {
  try {
    // Parse and validate body
    const body = await request.json()
    const validatedData = passwordFormSchema.safeParse(body)
    if (!validatedData.success) {
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          details: validatedData.error.format(),
        }),
        { status: 400 }
      )
    }

    const { currentPassword, newPassword } = validatedData.data

    // Check session (ensures user is authenticated)
    const session = await auth.api.getSession({
      headers: await headers(),
    })
    if (!session) {
      return new Response("Unauthorized", { status: 401 })
    }

    // Use Better Auth's built-in changePassword (verifies currentPassword server-side)
    const response = await auth.api.changePassword({
      body: {
        newPassword,
        currentPassword,
        revokeOtherSessions: true, // Uncomment to invalidate other sessions
      },
      headers: await headers(),
      asResponse: true,
    })

    return response
  } catch (error) {
    if (error instanceof APIError) {
      console.error("Better Auth API Error:", error.message, error.status)
      const statusCode = typeof error.status === "number" ? error.status : 500
      return new Response(error.message, { status: statusCode })
    }
    console.error("Unexpected error:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}
