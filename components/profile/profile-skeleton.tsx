"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function ProfileSkeleton() {
  return (
    <div className="container mx-auto max-w-6xl ">
      {/* Header Skeleton */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-r from-blue-600/10 to-purple-600/10" />
        <CardContent className="relative pt-8 pb-6">
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
            <div className="flex items-center gap-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-5 w-64" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
            </div>
            <div className="flex-1 md:mx-6">
              <Skeleton className="mb-2 h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-28" />
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 border-t pt-6 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="text-center">
                <Skeleton className="mx-auto mb-2 h-8 w-16" />
                <Skeleton className="mx-auto h-4 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs Skeleton */}
      <div className="mt-8">
        <div className="mb-6  flex  justify-between space-x-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-24" />
          ))}
        </div>

        {/* Content Skeleton */}
        <div className="">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <Skeleton className="mb-2 h-6 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <Skeleton className="h-9 w-20" />
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
