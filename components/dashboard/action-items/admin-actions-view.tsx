"use client"

import { useMemo } from "react"
import { ClipboardCheck, Flag, RefreshCcw } from "lucide-react"

import { ApiErrorException } from "@/types/api"
import { cn } from "@/lib/utils"
import { useActionItems } from "@/hooks/api/use-action-items"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ActionItemsTable } from "@/components/dashboard/action-items/action-items-table"
import { RecordActionItemTrigger } from "@/components/dashboard/action-items/record-action-item-trigger"

export function AdminActionsView() {
  const { data, isPending, isRefetching, error, refetch } = useActionItems({
    limit: 200,
  })

  const actionItems = data?.data ?? []
  const isRefreshing = isRefetching

  const summary = useMemo(() => {
    const openCount = actionItems.filter(
      (item) => item.status === "open"
    ).length
    const inProgressCount = actionItems.filter(
      (item) => item.status === "in_progress"
    ).length
    const blockedCount = actionItems.filter(
      (item) => item.status === "blocked"
    ).length
    const doneCount = actionItems.filter(
      (item) => item.status === "done"
    ).length

    return {
      openCount,
      inProgressCount,
      blockedCount,
      doneCount,
    }
  }, [actionItems])

  const isLoading = isPending && actionItems.length === 0

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Action Items</h1>
          <p className="text-sm text-muted-foreground">
            Monitor follow-ups and accountability across meetings.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <RecordActionItemTrigger onSuccess={() => void refetch()} />
          <Button
            variant="outline"
            onClick={() => void refetch()}
            disabled={isRefreshing}>
            <RefreshCcw className="h-4 w-4" />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error instanceof ApiErrorException
              ? error.help || error.message
              : "Failed to load action items"}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Open Tasks</CardTitle>
            <Flag className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div
                  className={cn(
                    "text-2xl font-semibold",
                    isRefreshing && "opacity-80"
                  )}>
                  {summary.openCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  Awaiting completion
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Flag className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div
                  className={cn(
                    "text-2xl font-semibold",
                    isRefreshing && "opacity-80"
                  )}>
                  {summary.inProgressCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  Actively being worked on
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Blocked</CardTitle>
            <Flag className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div
                  className={cn(
                    "text-2xl font-semibold",
                    isRefreshing && "opacity-80"
                  )}>
                  {summary.blockedCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  Needs intervention
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div
                  className={cn(
                    "text-2xl font-semibold",
                    isRefreshing && "opacity-80"
                  )}>
                  {summary.doneCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  Closed action items
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Action Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ActionItemsTable
            initialData={actionItems}
            onRefresh={async () => {
              await refetch()
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
