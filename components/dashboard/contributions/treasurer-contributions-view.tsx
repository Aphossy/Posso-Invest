"use client"

import { useMemo } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  RefreshCcw,
  Wallet,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useContributions } from "@/hooks/api/use-contributions"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ContributionsTable } from "@/components/dashboard/contributions/contributions-table"
import { RecordContributionTrigger } from "@/components/dashboard/contributions/record-contribution-trigger"

function formatRwf(amount?: string | number | null) {
  if (amount === null || amount === undefined) return "-"
  const value = typeof amount === "number" ? amount : Number.parseFloat(amount)
  if (Number.isNaN(value)) return "-"
  return `${new Intl.NumberFormat("en-RW").format(value)} RWF`
}

function getCurrentPeriod() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

export function TreasurerContributionsView() {
  const { data, isPending, isRefetching, error, refetch } = useContributions({
    limit: 400,
  })

  const contributions = useMemo(() => {
    const records = data?.data ?? []
    return [...records].sort((a, b) => {
      const aDate = new Date(a.createdAt || 0).getTime()
      const bDate = new Date(b.createdAt || 0).getTime()
      return bDate - aDate
    })
  }, [data?.data])

  const summary = useMemo(() => {
    let collectedTotal = 0
    let confirmedTotal = 0
    let pendingCount = 0
    let penaltyTotal = 0
    let penalizedCount = 0

    const statusCounts: Record<string, number> = {}
    const currentPeriod = getCurrentPeriod()
    let currentPeriodTotal = 0

    for (const item of contributions) {
      const amount = Number.parseFloat(item.amount || "0")
      const safeAmount = Number.isNaN(amount) ? 0 : amount
      collectedTotal += safeAmount

      statusCounts[item.status || "pending"] =
        (statusCounts[item.status || "pending"] || 0) + 1

      if (item.status === "confirmed") {
        confirmedTotal += safeAmount
      }

      if (item.status === "pending") {
        pendingCount += 1
      }

      const penalty = Number.parseFloat(item.penaltyAmount || "0")
      const safePenalty = Number.isNaN(penalty) ? 0 : penalty
      if (safePenalty > 0) {
        penaltyTotal += safePenalty
        penalizedCount += 1
      }

      if (item.period === currentPeriod) {
        currentPeriodTotal += safeAmount
      }
    }

    return {
      collectedTotal,
      confirmedTotal,
      pendingCount,
      penaltyTotal,
      penalizedCount,
      statusCounts,
      currentPeriod,
      currentPeriodTotal,
    }
  }, [contributions])

  const statusBadges = Object.entries(summary.statusCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 6)

  const isInitialLoading = isPending && contributions.length === 0
  const isBackgroundRefreshing = isRefetching && !isInitialLoading

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Member Contributions</h1>
          <p className="text-sm text-muted-foreground">
            Record, verify, and monitor contribution activity across all
            members.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <RecordContributionTrigger />
          <Button
            variant="outline"
            onClick={() => void refetch()}
            disabled={isRefetching}>
            <RefreshCcw className="h-4 w-4" />
            {isRefetching ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>
            {error.help ||
              error.message ||
              "Unable to load contribution records right now."}
          </AlertDescription>
        </Alert>
      ) : null}

      {!isPending && summary.penaltyTotal > 0 ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-900/40 dark:bg-rose-950/20">
          <div className="flex items-center gap-2 text-sm text-rose-700 dark:text-rose-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              <strong>{formatRwf(summary.penaltyTotal)}</strong> in penalties
              across {summary.penalizedCount} record
              {summary.penalizedCount !== 1 ? "s" : ""}.
            </span>
          </div>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="shrink-0 border-rose-300 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:text-rose-400">
            <Link href="/treasurer/contributions/penalties">
              View Penalties
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Collected Total
            </CardTitle>
            <Wallet className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {isInitialLoading ? (
              <>
                <Skeleton className="h-8 w-32" />
                <Skeleton className="mt-2 h-3 w-40" />
              </>
            ) : (
              <>
                <div
                  className={cn(
                    "text-2xl font-semibold tabular-nums transition-opacity",
                    isBackgroundRefreshing && "opacity-80"
                  )}>
                  {formatRwf(summary.collectedTotal)}
                </div>
                <p className="text-xs text-muted-foreground">
                  All recorded contributions
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            {isInitialLoading ? (
              <>
                <Skeleton className="h-8 w-32" />
                <Skeleton className="mt-2 h-3 w-36" />
              </>
            ) : (
              <>
                <div
                  className={cn(
                    "text-2xl font-semibold tabular-nums transition-opacity",
                    isBackgroundRefreshing && "opacity-80"
                  )}>
                  {formatRwf(summary.confirmedTotal)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Verified member savings
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Pending Records
            </CardTitle>
            <Calendar className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {isInitialLoading ? (
              <>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="mt-2 h-3 w-32" />
              </>
            ) : (
              <>
                <div
                  className={cn(
                    "text-2xl font-semibold transition-opacity",
                    isBackgroundRefreshing && "opacity-80"
                  )}>
                  {summary.pendingCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  Awaiting confirmation
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Late Penalties
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            {isInitialLoading ? (
              <>
                <Skeleton className="h-8 w-32" />
                <Skeleton className="mt-2 h-3 w-34" />
              </>
            ) : (
              <>
                <div
                  className={cn(
                    "text-2xl font-semibold tabular-nums transition-opacity",
                    isBackgroundRefreshing && "opacity-80"
                  )}>
                  {formatRwf(summary.penaltyTotal)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary.penalizedCount > 0
                    ? `${summary.penalizedCount} record${summary.penalizedCount !== 1 ? "s" : ""} with penalties`
                    : "No penalties issued"}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold">
              Contribution Records
            </CardTitle>
            {isInitialLoading ? (
              <Skeleton className="mt-2 h-4 w-52" />
            ) : (
              <p className="text-sm text-muted-foreground">
                Current cycle: {summary.currentPeriod} (
                {formatRwf(summary.currentPeriodTotal)})
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!isInitialLoading && statusBadges.length > 0
              ? statusBadges.map(([status, count]) => (
                  <Badge key={status} variant="outline">
                    {status}: {count}
                  </Badge>
                ))
              : null}
          </div>
        </CardHeader>
        <CardContent>
          {isBackgroundRefreshing ? (
            <div className="mb-3 h-1.5 w-40 rounded-full bg-muted animate-pulse" />
          ) : null}
          <ContributionsTable
            initialData={contributions}
            onRefresh={refetch}
            loading={isInitialLoading}
            isRefreshing={isBackgroundRefreshing}
          />
        </CardContent>
      </Card>
    </div>
  )
}
