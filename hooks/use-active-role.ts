import { useEffect, useState } from "react"
import type { UserRole } from "@/constants/navigation"
import { extractRoleValue } from "@/utils/role-utils"

import { authClient } from "@/lib/auth-client"
import { organizationClient } from "@/lib/organization-client"

const normalizeRole = (role?: string | null): UserRole => {
  if (
    role === "admin" ||
    role === "president" ||
    role === "treasurer" ||
    role === "secretary"
  ) {
    return role
  }
  return "member"
}

export function useActiveRole() {
  const { data: session } = authClient.useSession()
  const { data: activeMemberRole, isPending: isRolePending } =
    authClient.useActiveMemberRole()
  const [resolvedRole, setResolvedRole] = useState<string | null>(null)
  const [isResolving, setIsResolving] = useState(false)

  const roleFromHook = extractRoleValue(activeMemberRole)

  useEffect(() => {
    if (!session?.user) {
      setResolvedRole(null)
      return
    }
    if (roleFromHook) {
      setResolvedRole(roleFromHook)
      return
    }
    if (resolvedRole) {
      return
    }
    if (isRolePending || isResolving) {
      return
    }

    let cancelled = false

    const resolveRole = async () => {
      setIsResolving(true)
      try {
        const activeOrgId = session?.session?.activeOrganizationId

        if (activeOrgId) {
          await organizationClient.setActive({ organizationId: activeOrgId })
        } else {
          const orgResponse = await organizationClient.list()
          const organizations = orgResponse.data || []
          if (organizations.length > 0) {
            await organizationClient.setActive({
              organizationId: organizations[0].id,
            })
          }
        }

        const roleResponse = await organizationClient.getActiveMemberRole()
        const fetchedRole = extractRoleValue(roleResponse)
        if (!cancelled) {
          setResolvedRole(fetchedRole)
        }
      } catch {
        if (!cancelled) {
          setResolvedRole(null)
        }
      } finally {
        if (!cancelled) {
          setIsResolving(false)
        }
      }
    }

    void resolveRole()

    return () => {
      cancelled = true
    }
  }, [
    session?.user,
    session?.session?.activeOrganizationId,
    roleFromHook,
    resolvedRole,
    isRolePending,
    isResolving,
  ])

  const activeRole = roleFromHook ?? resolvedRole
  const role = activeRole ? normalizeRole(activeRole) : null
  const isRoleReady = Boolean(role)

  return {
    role,
    session,
    activeMemberRole,
    isRolePending: isRolePending || isResolving,
    isRoleReady,
  }
}
