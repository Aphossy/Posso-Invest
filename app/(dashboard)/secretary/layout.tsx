import type React from "react"
import { Suspense } from "react"

import { OrbitingSpinner } from "@/components/ui/spinner"
import { RoleGuard } from "@/components/auth/role-guard"
import { DashboardLayout } from "@/components/layout/dashboard-layout"

export default function SecretaryDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={<OrbitingSpinner />}>
      <RoleGuard allowedRoles={["secretary", "admin"]}>
        <DashboardLayout title="Secretary">{children}</DashboardLayout>
      </RoleGuard>
    </Suspense>
  )
}
