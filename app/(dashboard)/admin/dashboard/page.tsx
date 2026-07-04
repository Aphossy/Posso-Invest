import { Suspense } from "react"
import { Metadata } from "next"

import { Skeleton } from "@/components/ui/skeleton"
import { AdminDashboardContent } from "@/components/dashboard/admin/dashboard/admin-dashboard-content"

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description:
    "Comprehensive overview of platform metrics and operations for administrators on TrustLink Group.",
}

export default function AdminDashboardPage() {
  return (
    <div className="flex-1 space-y-4 p-4">
      <Suspense fallback={<DashboardSkeleton />}>
        <AdminDashboardContent />
      </Suspense>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-48" />
    </div>
  )
}
