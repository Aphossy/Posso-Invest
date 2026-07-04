"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function SettingsSkeleton() {
  return (
    <div className="container mx-auto space-y-6 p-4">
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-r from-blue-600/10 to-emerald-600/20" />
        <CardContent className="relative md:p-8">
          <div className="flex flex-col items-start gap-2 lg:gap-20 lg:flex-row lg:items-center">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-44" />
                <Skeleton className="h-4 w-36" />
              </div>
            </div>

            <div className="hidden md:grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>

            <div className="hidden md:flex gap-3">
              <Skeleton className="h-9 w-20" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4 w-full">
        <div className="grid w-full grid-cols-2 gap-1 rounded-md bg-muted p-1 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-full" />
          ))}
        </div>

        <div className="rounded-lg bg-card">
          <Card>
            <CardHeader>
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-80 max-w-full" />
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-6 w-24" />
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-11 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-11 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
