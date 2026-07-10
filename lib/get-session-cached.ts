/**
 * Cached session resolution to prevent duplicate database queries
 * Uses React's cache() for request-scoped memoization
 *
 * Problem: Each API route independently fetches session + user + member role
 * causing 5-6x duplicate queries per request
 *
 * Solution: Cache at request scope so subsequent calls in same request reuse result
 */

import { cache } from "react"
import { headers } from "next/headers"
import { db } from "@/db"
import { member } from "@/db/schemas"
import { eq, and } from "drizzle-orm"

import { auth } from "./auth"
import { extractRoleValue } from "@/utils/role-utils"

interface SessionInfo {
  user: any
  role: string | null
  activeOrganizationId: string | null
  sessionRole: string | null
}

/**
 * Memoized at request scope - subsequent calls return cached result
 * Eliminates duplicate session/user/member queries
 */
export const getSessionUserCached = cache(async (): Promise<SessionInfo> => {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })
  const sessionUser = session?.user || null
  const sessionRole = sessionUser?.role ?? null
  const activeOrganizationId = session?.session?.activeOrganizationId

  let activeRole: string | null = null

  // Try to get role from member table (once, cached)
  if (sessionUser?.id && activeOrganizationId) {
    try {
      const rows = await db
        .select({ role: member.role })
        .from(member)
        .where(
          and(
            eq(member.organizationId, activeOrganizationId),
            eq(member.userId, sessionUser.id)
          )
        )
        .limit(1)
      activeRole = rows[0]?.role ?? null
    } catch (error) {
      console.error("[getSessionUserCached] member lookup failed", {
        userId: sessionUser.id,
        activeOrganizationId,
        error,
      })
    }
  }

  // Fallback to organization API if member role not found
  if (!activeRole && sessionUser?.id) {
    try {
      const orgApi = (auth.api as any).organization
      if (orgApi?.getActiveMemberRole) {
        const roleResponse = await orgApi.getActiveMemberRole({
          headers: headersList,
        })
        activeRole = extractRoleValue(roleResponse)
      }
    } catch (error) {
      console.error("[getSessionUserCached] getActiveMemberRole fallback failed", {
        userId: sessionUser?.id,
        error,
      })
    }
  }

  return {
    user: sessionUser,
    role: activeRole,
    activeOrganizationId: activeOrganizationId ?? null,
    sessionRole,
  }
})

/**
 * Utility to verify user is authenticated
 * Usage: const { user } = await getSessionUserCached()
 *        if (!user) return unauthorized()
 */
export async function requireSessionUser() {
  const { user } = await getSessionUserCached()
  if (!user) {
    throw new Error("Unauthorized: User not authenticated")
  }
  return user
}

/**
 * Utility to get effective role (member role takes precedence over session role)
 */
export async function getEffectiveRole(): Promise<string | null> {
  const { role, sessionRole } = await getSessionUserCached()
  return role ?? sessionRole
}
