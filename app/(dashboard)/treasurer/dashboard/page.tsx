import { Suspense } from "react"
import { Metadata } from "next"

import { Skeleton } from "@/components/ui/skeleton"
import { TreasurerDashboardContent } from "@/components/dashboard/treasurer/dashboard/treasurer-dashboard-content"

export const metadata: Metadata = {
  title: "Treasurer Dashboard",
  description:
    "Monitor contributions, loans, penalties, and financial health for TrustLink Group.",
}

export default function TreasurerDashboardPage() {
  return (
    <div className="flex-1 space-y-4 p-4">
      <Suspense fallback={<DashboardSkeleton />}>
        <TreasurerDashboardContent />
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
