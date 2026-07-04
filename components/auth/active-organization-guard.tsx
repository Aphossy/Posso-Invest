"use client"

import { useEffect, useRef } from "react"

import { authClient } from "@/lib/auth-client"
import { organizationClient } from "@/lib/organization-client"
import { organisationName } from "@/constants/organisation"

export function ActiveOrganizationGuard() {
  const { data: session } = authClient.useSession()
  const hasAttemptedSetup = useRef(false)

  useEffect(() => {
    if (!session?.user) return
    if (hasAttemptedSetup.current) return
    hasAttemptedSetup.current = true

    const tryActivateOrganization = async (organizationId?: string | null) => {
      if (!organizationId) return false
      const activeResponse = await organizationClient.setActive({
        organizationId,
      })
      return !activeResponse?.error
    }

    const createDefaultOrganization = async () => {
      const defaultSlug = `${organisationName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")}-${Math.random().toString(36).slice(2, 8)}`

      const createResponse = await organizationClient.create({
        name: organisationName,
        slug: defaultSlug,
        metadata: {
          type: "ikimina",
        },
      })

      const createdOrgId = createResponse?.data?.id
      if (!createdOrgId) {
        throw new Error(
          createResponse?.error?.message || "Failed to create default organization"
        )
      }

      const activated = await tryActivateOrganization(createdOrgId)
      if (!activated) {
        throw new Error("Failed to activate created organization")
      }
    }

    const resolveOrganization = async () => {
      const activeOrgId = session?.session?.activeOrganizationId
      if (activeOrgId) {
        const activated = await tryActivateOrganization(activeOrgId)
        if (activated) {
          return
        }
      }

      const orgResponse = await organizationClient.list()
      const organizations = orgResponse.data || []

      for (const org of organizations) {
        const activated = await tryActivateOrganization(org.id)
        if (activated) {
          return
        }
      }

      if (session.user.role === "admin") {
        await createDefaultOrganization()
      }
    }

    resolveOrganization().catch((error: unknown) => {
      console.error("Failed to resolve organization:", error)
    })
  }, [session?.user, session?.session?.activeOrganizationId])

  return null
}
