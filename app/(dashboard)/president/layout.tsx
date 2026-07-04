import type React from "react"
import { Suspense } from "react"

import { OrbitingSpinner } from "@/components/ui/spinner"
import { RoleGuard } from "@/components/auth/role-guard"
import { DashboardLayout } from "@/components/layout/dashboard-layout"

export default function PresidentDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={<OrbitingSpinner />}>
      <RoleGuard allowedRoles={["president", "admin"]}>
        <DashboardLayout title="President">{children}</DashboardLayout>
      </RoleGuard>
    </Suspense>
  )
}
