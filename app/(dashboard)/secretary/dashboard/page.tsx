import { Suspense } from "react"
import { Metadata } from "next"

import { Skeleton } from "@/components/ui/skeleton"
import { SecretaryDashboardContent } from "@/components/dashboard/secretary/dashboard/secretary-dashboard-content"

export const metadata: Metadata = {
  title: "Secretary Dashboard",
  description:
    "Manage meetings, minutes, action items, and communications for 10/10 Venture.",
}

export default function SecretaryDashboardPage() {
  return (
    <div className="flex-1 space-y-4 p-4">
      <Suspense fallback={<DashboardSkeleton />}>
        <SecretaryDashboardContent />
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
