"use client"

import type React from "react"
import { useEffect, useRef } from "react"
import type { Route } from "next"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { getRoleDashboard } from "@/utils/role-utils"

import { authClient } from "@/lib/auth-client"
import { useActiveRole } from "@/hooks/use-active-role"

import { OrbitingSpinner } from "../ui/spinner"

interface RoleGuardProps {
  children: React.ReactNode
  allowedRoles: string[]
  redirectTo?: string
}

export function RoleGuard({
  children,
  allowedRoles,
  redirectTo,
}: RoleGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data: session, error, isPending } = authClient.useSession()
  const { role, isRolePending, isRoleReady } = useActiveRole()
  const hasRedirectedRef = useRef(false)

  // === ALL HOOKS AT TOP ===
  useEffect(() => {
    // Don't do anything while still loading
    if (isPending || isRolePending || hasRedirectedRef.current) return

    if (!session) {
      hasRedirectedRef.current = true
      const search = searchParams.toString()
      const from = search ? `${pathname}?${search}` : pathname
      router.replace(`/login?from=${encodeURIComponent(from)}` as Route)
      return
    }

    if (!isRoleReady) {
      hasRedirectedRef.current = true
      router.replace("/unauthorized?reason=no-role" as Route)
      return
    }

    // Role not allowed → redirect
    if (!role || !allowedRoles.includes(role)) {
      hasRedirectedRef.current = true
      const defaultRedirect = getRoleDashboard(role || "member")
      router.replace((redirectTo || defaultRedirect) as Route)
    }
  }, [
    session,
    isPending,
    isRolePending,
    isRoleReady,
    allowedRoles,
    redirectTo,
    router,
    role,
    pathname,
    searchParams,
  ])
  // === END OF HOOKS ===

  // === Render Logic ===

  if (isPending || isRolePending) {
    return (
      <div className="flex min-h-screen items-center justify-center py-20">
        <OrbitingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center py-20">
        <p className="text-red-600">Error: {error.message}</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center py-20">
        <OrbitingSpinner />
      </div>
    )
  }

  if (!isRoleReady) {
    return (
      <div className="flex min-h-screen items-center justify-center py-20">
        <OrbitingSpinner />
      </div>
    )
  }

  // Show loading during refetch or redirect
  if (!role || !allowedRoles.includes(role)) {
    return (
      <div className="flex min-h-screen items-center justify-center py-20">
        <OrbitingSpinner />
      </div>
    )
  }

  return <main className="min-h-screen">{children}</main>
}
