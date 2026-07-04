"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import type { Route } from "next"
import { useRouter, useSearchParams } from "next/navigation"
import {
  extractRoleValue,
  getRoleDashboard,
  roleRoutes,
} from "@/utils/role-utils"

import { authClient } from "@/lib/auth-client"
import { organizationClient } from "@/lib/organization-client"
import { organisationName } from "@/constants/organisation"
import { Button } from "@/components/ui/button"
import { OrbitingSpinner } from "@/components/ui/spinner"

function getSafeRedirectUrl(
  from: string | undefined,
  userRole: string
): string {
  if (!from) {
    return getRoleDashboard(userRole)
  }

  const decodedFrom = decodeURIComponent(from)
  if (
    decodedFrom.startsWith("http://") ||
    decodedFrom.startsWith("https://") ||
    decodedFrom.startsWith("//")
  ) {
    return getRoleDashboard(userRole)
  }

  const safePath = decodedFrom.startsWith("/") ? decodedFrom : `/${decodedFrom}`
  if (safePath.startsWith("/accept-invitation")) {
    return safePath
  }

  const allowedPrefixes = roleRoutes[userRole] || []
  const hasAccess = allowedPrefixes.some((prefix) =>
    safePath.startsWith(prefix)
  )

  if (!hasAccess) {
    return getRoleDashboard(userRole)
  }

  return safePath
}

function RedirectContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectFrom = searchParams.get("from")
  const invitationId = searchParams.get("invitationId")
  const { data: session, isPending } = authClient.useSession()
  const [isResolving, setIsResolving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const getInvitationRedirect = () => {
    if (invitationId) {
      return `/accept-invitation?invitationId=${encodeURIComponent(invitationId)}`
    }
    if (redirectFrom?.startsWith("/accept-invitation")) {
      return redirectFrom
    }
    return null
  }

  const redirectToInvitationIfPresent = useCallback(() => {
    const invitationRedirect = getInvitationRedirect()
    if (!invitationRedirect) return false
    router.replace(invitationRedirect as Route)
    return true
  }, [invitationId, redirectFrom, router])

  const resolveAndRedirect = useCallback(async () => {
    if (!session?.user) return
    if (isResolving) return

    let cancelled = false

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

      const activeCreated = await tryActivateOrganization(createdOrgId)
      if (!activeCreated) {
        throw new Error("Failed to activate created organization")
      }

      return true
    }

    const ensureActiveOrganization = async () => {
      const activeOrgId = session?.session?.activeOrganizationId

      if (activeOrgId) {
        const activated = await tryActivateOrganization(activeOrgId)
        if (activated) {
          return true
        }
      }

      const orgResponse = await organizationClient.list()
      const organizations = orgResponse.data || []

      if (organizations.length === 0) {
        if (session.user.role === "admin") {
          return await createDefaultOrganization()
        }

        redirectToInvitationIfPresent()
        return false
      }

      for (const org of organizations) {
        const activated = await tryActivateOrganization(org.id)
        if (activated) {
          return true
        }
      }

      if (session.user.role === "admin") {
        return await createDefaultOrganization()
      }

      throw new Error("No accessible organization could be activated")
    }

    const handleFailure = (reason: string, message?: string) => {
      if (cancelled) return
      setErrorMessage(
        message || "We could not complete the redirect. Please try again."
      )
      router.replace(
        `/unauthorized?reason=${encodeURIComponent(reason)}` as Route
      )
    }

    setIsResolving(true)
    setErrorMessage(null)

    try {
      const roleResponse = await organizationClient.getActiveMemberRole()
      let resolvedRole = extractRoleValue(roleResponse)

      if (!resolvedRole) {
        const hasOrganization = await ensureActiveOrganization()

        if (!hasOrganization) {
          if (redirectToInvitationIfPresent()) {
            return
          }
          handleFailure("no-organization")
          return
        }

        const retryResponse = await organizationClient.getActiveMemberRole()
        resolvedRole = extractRoleValue(retryResponse)
      }

      if (!resolvedRole) {
        if (redirectToInvitationIfPresent()) {
          return
        }
        handleFailure("no-role")
        return
      }

      if (!cancelled) {
        const redirectUrl = getSafeRedirectUrl(
          redirectFrom || undefined,
          resolvedRole
        )
        router.replace(redirectUrl as Route)
      }
    } catch (error: any) {
      const message = error?.message || "Unable to resolve organization role."
      handleFailure("role-unavailable", message)
    } finally {
      if (!cancelled) {
        setIsResolving(false)
      }
    }

    return () => {
      cancelled = true
    }
  }, [
    isResolving,
    redirectFrom,
    redirectToInvitationIfPresent,
    router,
    session?.user,
    session?.session?.activeOrganizationId,
  ])

  useEffect(() => {
    if (isPending || isResolving) return

    if (!session?.user) {
      const loginUrl = redirectFrom
        ? `/login?from=${encodeURIComponent(redirectFrom)}`
        : "/login"
      router.replace(loginUrl as Route)
      return
    }

    void resolveAndRedirect()
  }, [
    isPending,
    isResolving,
    session?.user,
    redirectFrom,
    router,
    resolveAndRedirect,
  ])

  return (
    <div className="flex min-h-screen items-center justify-center py-20">
      <div className="flex flex-col items-center gap-4 text-center">
        <OrbitingSpinner />
        {errorMessage && (
          <p className="max-w-md text-sm text-muted-foreground">
            {errorMessage}
          </p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" onClick={() => void resolveAndRedirect()}>
            Try again
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/login")}>
            Back to login
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function RedirectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center py-20">
          <OrbitingSpinner />
        </div>
      }>
      <RedirectContent />
    </Suspense>
  )
}
