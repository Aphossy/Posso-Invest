// app\(dashboard)\customer\layout.tsx
import type React from "react"
import { Suspense } from "react"

import { OrbitingSpinner } from "@/components/ui/spinner"
import { RoleGuard } from "@/components/auth/role-guard"
import { DashboardLayout } from "@/components/layout/dashboard-layout"

export default function CustomerDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={<OrbitingSpinner />}>
      <RoleGuard allowedRoles={["member", "admin"]}>
        <DashboardLayout title="Dashboard">{children}</DashboardLayout>
      </RoleGuard>
    </Suspense>
  )
}
