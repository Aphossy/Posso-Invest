import { headers } from "next/headers"
import { db } from "@/db"
import { session as sessionTable, user as userTable } from "@/db/schemas"
import { eq } from "drizzle-orm"

import { auth } from "./auth"

/**
 * Get authenticated session from either cookies (web) or Authorization header (mobile)
 * Supports both web and mobile authentication flows
 */
export async function getAuthSession() {
  const headersList = await headers()

  // Try to get session from cookies first (standard web flow)
  let session = await auth.api.getSession({
    headers: headersList,
  })

  console.log(
    "[getAuthSession] Session from cookies:",
    session ? "found" : "not found"
  )

  // If no session from cookies, check Authorization header (mobile flow)
  if (!session) {
    const authHeader = headersList.get("authorization")
    console.log(
      "[getAuthSession] Authorization header:",
      authHeader ? "present" : "missing"
    )

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7) // Remove "Bearer " prefix
      console.log(
        "[getAuthSession] Bearer token extracted:",
        token.substring(0, 20) + "..."
      )

      try {
        // Query the database directly for the session token
        const [sessionRecord] = await db
          .select()
          .from(sessionTable)
          .where(eq(sessionTable.token, token))
          .limit(1)

        console.log(
          "[getAuthSession] Session record from DB:",
          sessionRecord ? "found" : "not found"
        )

        if (sessionRecord) {
          // Check if session is expired
          if (new Date(sessionRecord.expiresAt) < new Date()) {
            console.log("[getAuthSession] Session expired")
            return null
          }

          // Get the user associated with this session
          const [userRecord] = await db
            .select()
            .from(userTable)
            .where(eq(userTable.id, sessionRecord.userId))
            .limit(1)

          console.log(
            "[getAuthSession] User record from DB:",
            userRecord ? "found" : "not found"
          )

          if (userRecord) {
            // Return session in the format Better Auth expects
            session = {
              session: {
                id: sessionRecord.id,
                userId: sessionRecord.userId,
                expiresAt: sessionRecord.expiresAt,
                token: sessionRecord.token,
                createdAt: sessionRecord.createdAt,
                updatedAt: sessionRecord.updatedAt,
                ipAddress: sessionRecord.ipAddress,
                userAgent: sessionRecord.userAgent,
                impersonatedBy: sessionRecord.impersonatedBy,
              },
              user: {
                id: userRecord.id,
                name: userRecord.name,
                email: userRecord.email,
                emailVerified: userRecord.emailVerified,
                image: userRecord.image,
                createdAt: userRecord.createdAt,
                updatedAt: userRecord.updatedAt,
                role: userRecord.role,
                banned: userRecord.banned,
                banReason: userRecord.banReason,
                banExpires: userRecord.banExpires,
                lastLoginMethod: userRecord.lastLoginMethod,
                twoFactorEnabled: userRecord.twoFactorEnabled,
              },
            }

            console.log("[getAuthSession] Session constructed successfully")
          }
        }
      } catch (error) {
        console.error(
          "[getAuthSession] Failed to validate session token from Authorization header:",
          error
        )
        return null
      }
    }
  }

  console.log(
    "[getAuthSession] Final result:",
    session ? "authenticated" : "not authenticated"
  )
  return session
}
