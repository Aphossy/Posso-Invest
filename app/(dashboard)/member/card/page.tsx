import { Suspense } from "react"
import { type Metadata } from "next"

import { Skeleton } from "@/components/ui/skeleton"
import { MemberCardPageContent } from "@/components/dashboard/member/card/member-card-page"

export const metadata: Metadata = {
  title: "My Member Card",
  description:
    "View your interactive Posso Ventures membership card with physics-based 3D lanyard.",
}

export default function MemberCardPage() {
  return (
    <div className="flex-1 space-y-4 p-4">
      <Suspense fallback={<CardPageSkeleton />}>
        <MemberCardPageContent />
      </Suspense>
    </div>
  )
}

function CardPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="w-full h-[560px] rounded-2xl" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
