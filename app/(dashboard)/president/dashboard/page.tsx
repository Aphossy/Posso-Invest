import { Suspense } from "react"
import { Metadata } from "next"

import { Skeleton } from "@/components/ui/skeleton"
import { PresidentDashboardContent } from "@/components/dashboard/president/dashboard/president-dashboard-content"

export const metadata: Metadata = {
  title: "President Dashboard",
  description:
    "Governance overview and financial authorization for TrustLink Group.",
}

export default function PresidentDashboardPage() {
  return (
    <div className="flex-1 space-y-4 p-4">
      <Suspense fallback={<DashboardSkeleton />}>
        <PresidentDashboardContent />
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
