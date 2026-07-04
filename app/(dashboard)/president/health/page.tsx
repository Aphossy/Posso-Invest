import { Suspense } from "react"
import { Metadata } from "next"

import { Skeleton } from "@/components/ui/skeleton"
import { PresidentHealthContent } from "@/components/dashboard/president/health/president-health-content"

export const metadata: Metadata = {
  title: "Group Health",
  description:
    "Real-time health and risk indicators for TrustLink Group - contributions, loans, members, and governance.",
}

export default function PresidentHealthPage() {
  return (
    <div className="flex-1 space-y-4 p-4">
      <Suspense fallback={<HealthPageFallback />}>
        <PresidentHealthContent />
      </Suspense>
    </div>
  )
}

function HealthPageFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
    </div>
  )
}
