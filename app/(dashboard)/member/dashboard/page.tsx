import { Suspense } from "react"
import { Metadata } from "next"

import { Skeleton } from "@/components/ui/skeleton"
import { MemberDashboardContent } from "@/components/dashboard/member/dashboard/member-dashboard-content"

export const metadata: Metadata = {
  title: "Member Dashboard",
  description:
    "Track savings, meetings, loans, and your Ikimina status in your TrustLink Group dashboard.",
}

export default function MemberDashboardPage() {
  return (
    <div className="flex-1 space-y-4 p-4">
      <Suspense fallback={<DashboardSkeleton />}>
        <MemberDashboardContent />
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
