"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { siteConfig } from "@/constants/site-config"
import { addMonths, format, isWithinInterval, parse, subMonths } from "date-fns"
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock,
  RefreshCcw,
  Users,
  Wallet,
} from "lucide-react"

import { getActivePeriod, getWindowForPeriod } from "@/lib/contribution-window"
import { useContributions } from "@/hooks/api/use-contributions"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { RecordContributionTrigger } from "@/components/dashboard/contributions/record-contribution-trigger"

const { monthlyContributionRwf, contributionWindow, latePenaltyRate } =
  siteConfig.platform.savings

function formatRwf(amount?: string | number | null) {
  if (amount === undefined || amount === null) return "-"
  const value = typeof amount === "number" ? amount : Number.parseFloat(amount)
  if (Number.isNaN(value)) return "-"
  return `${new Intl.NumberFormat("en-RW").format(value)}\u00A0RWF`
}

function formatDate(value?: string | Date | null) {
  if (!value) return "-"
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleDateString("en-RW", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function statusVariant(
  status?: string
): "success" | "warning" | "danger" | "secondary" | "outline" {
  switch (status) {
    case "confirmed":
      return "success"
    case "pending":
      return "warning"
    case "late":
      return "danger"
    case "waived":
      return "secondary"
    default:
      return "outline"
  }
}

function statusIcon(status?: string) {
  switch (status) {
    case "confirmed":
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
    case "pending":
      return <Clock className="h-3.5 w-3.5 text-amber-500" />
    case "late":
      return <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
    case "waived":
      return <CircleDollarSign className="h-3.5 w-3.5 text-zinc-400" />
    default:
      return null
  }
}

function periodLabel(period: string) {
  try {
    return format(parse(period, "yyyy-MM", new Date()), "MMMM yyyy")
  } catch {
    return period
  }
}

export function TreasurerContributionWindowView() {
  const today = new Date()
  const activePeriod = useMemo(() => getActivePeriod(), [])
  const [selectedPeriod, setSelectedPeriod] = useState(activePeriod)

  const { data, isPending, isRefetching, error, refetch } = useContributions({
    period: selectedPeriod,
    limit: 200,
  })

  const contributions = useMemo(() => data?.data ?? [], [data?.data])

  const { windowStart, windowEnd } = useMemo(
    () => getWindowForPeriod(selectedPeriod),
    [selectedPeriod]
  )

  const isWindowOpen = useMemo(
    () => isWithinInterval(today, { start: windowStart, end: windowEnd }),
    [windowStart, windowEnd]
  )

  // Only relevant for the active period - windows in the past are always "closed"
  const isCurrentPeriod = selectedPeriod === activePeriod
  const isFuturePeriod =
    parse(selectedPeriod, "yyyy-MM", new Date()) >
    new Date(today.getFullYear(), today.getMonth(), 1)

  const summary = useMemo(() => {
    let collected = 0
    let confirmed = 0
    let pendingCount = 0
    let lateCount = 0
    let waivedCount = 0
    let penalties = 0

    for (const c of contributions) {
      const amount = Number.parseFloat(c.amount || "0")
      const safeAmount = Number.isNaN(amount) ? 0 : amount
      collected += safeAmount

      if (c.status === "confirmed") {
        confirmed += safeAmount
      }
      if (c.status === "pending") pendingCount++
      if (c.status === "late") {
        lateCount++
        const penalty = Number.parseFloat(c.penaltyAmount || "0")
        penalties += Number.isNaN(penalty) ? 0 : penalty
      }
      if (c.status === "waived") waivedCount++
    }

    return {
      collected,
      confirmed,
      pendingCount,
      lateCount,
      waivedCount,
      penalties,
      total: contributions.length,
    }
  }, [contributions])

  const isInitialLoading = isPending && contributions.length === 0

  function navigatePeriod(direction: -1 | 1) {
    const current = parse(selectedPeriod, "yyyy-MM", new Date())
    const next = direction === 1 ? addMonths(current, 1) : subMonths(current, 1)
    setSelectedPeriod(format(next, "yyyy-MM"))
  }

  const canGoNext = !isCurrentPeriod

  return (
    <div className="flex-1 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Contribution Window</h1>
            <p className="text-sm text-muted-foreground">
              Monitor member payment activity within each monthly window.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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

      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error.help || error.message || "Unable to load contributions."}
          </AlertDescription>
        </Alert>
      )}

      {/* Period Navigator */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigatePeriod(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-[160px] text-center">
                <p className="text-lg font-semibold">
                  {periodLabel(selectedPeriod)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Period window:{" "}
                  <span className="font-medium">
                    {format(windowStart, "MMM d")} –{" "}
                    {format(windowEnd, "MMM d, yyyy")}
                  </span>
                </p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigatePeriod(1)}
                disabled={canGoNext === false}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-3">
              {isCurrentPeriod && (
                <div className="flex items-center gap-1.5">
                  <div
                    className={`h-2 w-2 rounded-full ${isWindowOpen ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"}`}
                  />
                  <span
                    className={`text-sm font-medium ${isWindowOpen ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                    {isWindowOpen ? "Window Open" : "Window Closed"}
                  </span>
                </div>
              )}
              {!isCurrentPeriod && !isFuturePeriod && (
                <Badge variant="secondary">Past Period</Badge>
              )}
              {isFuturePeriod && <Badge variant="outline">Future Period</Badge>}
              {!isCurrentPeriod && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedPeriod(activePeriod)}>
                  Back to current
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Window Info Banner */}
      <Alert className="border-primary/20 bg-primary/5">
        <CalendarDays className="h-4 w-4 text-primary" />
        <AlertDescription className="text-sm">
          The monthly contribution window opens on the{" "}
          <strong>{contributionWindow.startDay}th</strong> of the previous month
          and closes on the <strong>{contributionWindow.endDay}th</strong> of
          the current month. Payments outside this window incur a{" "}
          <strong>{(latePenaltyRate * 100).toFixed(0)}% late penalty</strong>.
        </AlertDescription>
      </Alert>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Collected</CardTitle>
            <Wallet className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {isInitialLoading ? (
              <>
                <Skeleton className="h-8 w-32" />
                <Skeleton className="mt-2 h-3 w-28" />
              </>
            ) : (
              <>
                <div className="text-2xl font-semibold tabular-nums">
                  {formatRwf(summary.collected)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary.total} record{summary.total !== 1 ? "s" : ""} this
                  period
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            {isInitialLoading ? (
              <>
                <Skeleton className="h-8 w-32" />
                <Skeleton className="mt-2 h-3 w-28" />
              </>
            ) : (
              <>
                <div className="text-2xl font-semibold tabular-nums">
                  {formatRwf(summary.confirmed)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {contributions.filter((c) => c.status === "confirmed").length}{" "}
                  verified
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Pending / Late
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {isInitialLoading ? (
              <>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="mt-2 h-3 w-28" />
              </>
            ) : (
              <>
                <div className="text-2xl font-semibold tabular-nums">
                  {summary.pendingCount + summary.lateCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary.pendingCount} pending · {summary.lateCount} late
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Penalties</CardTitle>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            {isInitialLoading ? (
              <>
                <Skeleton className="h-8 w-32" />
                <Skeleton className="mt-2 h-3 w-28" />
              </>
            ) : (
              <>
                <div className="text-2xl font-semibold tabular-nums">
                  {formatRwf(summary.penalties)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary.lateCount} late payment
                  {summary.lateCount !== 1 ? "s" : ""}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Members Contributions Table */}
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold">
              Contributions for {periodLabel(selectedPeriod)}
            </CardTitle>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Window:{" "}
              <span className="font-medium">
                {format(windowStart, "MMM d")} –{" "}
                {format(windowEnd, "MMM d, yyyy")}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!isInitialLoading && (
              <>
                {contributions.filter((c) => c.status === "confirmed").length >
                  0 && (
                  <Badge variant="success">
                    {
                      contributions.filter((c) => c.status === "confirmed")
                        .length
                    }{" "}
                    confirmed
                  </Badge>
                )}
                {summary.pendingCount > 0 && (
                  <Badge variant="warning">
                    {summary.pendingCount} pending
                  </Badge>
                )}
                {summary.lateCount > 0 && (
                  <Badge variant="danger">{summary.lateCount} late</Badge>
                )}
                {summary.waivedCount > 0 && (
                  <Badge variant="secondary">
                    {summary.waivedCount} waived
                  </Badge>
                )}
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isInitialLoading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : contributions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <Users className="h-10 w-10 text-muted-foreground/40" />
              <div>
                <p className="font-medium text-muted-foreground">
                  No contributions recorded
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isFuturePeriod
                    ? "This period hasn't started yet."
                    : "No contributions have been recorded for this period."}
                </p>
              </div>
              {!isFuturePeriod && <RecordContributionTrigger />}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Penalty</TableHead>
                  <TableHead>Paid Date</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Payment Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contributions.map((c) => {
                  const paidDate = c.paidAt ? new Date(c.paidAt) : null
                  const paidInWindow =
                    paidDate &&
                    isWithinInterval(paidDate, {
                      start: windowStart,
                      end: windowEnd,
                    })

                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {c.memberName || "Unknown Member"}
                          </p>
                          {c.memberEmail && (
                            <p className="text-xs text-muted-foreground">
                              {c.memberEmail}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {statusIcon(c.status)}
                          <Badge
                            variant={statusVariant(c.status)}
                            className="capitalize">
                            {c.status || "unknown"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="tabular-nums font-medium">
                        {formatRwf(c.amount)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {c.penaltyAmount &&
                        Number.parseFloat(c.penaltyAmount) > 0 ? (
                          <span className="text-red-600 dark:text-red-400">
                            +{formatRwf(c.penaltyAmount)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{formatDate(c.paidAt)}</p>
                          {paidDate && (
                            <p
                              className={`text-xs ${paidInWindow ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                              {paidInWindow
                                ? "Within window"
                                : "Outside window"}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.receiptNumber || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="capitalize text-sm">
                        {c.metadata?.paymentMethod === "momo"
                          ? "Mobile Money"
                          : c.metadata?.paymentMethod || (
                              <span className="text-muted-foreground">-</span>
                            )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Window Summary Footer */}
      {!isInitialLoading && contributions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Window Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">
                  Expected per member
                </p>
                <p className="text-lg font-semibold tabular-nums">
                  {formatRwf(monthlyContributionRwf)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Monthly obligation
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Total collected</p>
                <p className="text-lg font-semibold tabular-nums">
                  {formatRwf(summary.collected)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {summary.total} record{summary.total !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">
                  Late penalty rate
                </p>
                <p className="text-lg font-semibold tabular-nums">
                  {(latePenaltyRate * 100).toFixed(0)}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatRwf(monthlyContributionRwf * latePenaltyRate)} per
                  missed window
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">
                  Penalties collected
                </p>
                <p className="text-lg font-semibold tabular-nums text-red-600 dark:text-red-400">
                  {formatRwf(summary.penalties)}
                </p>
                <p className="text-xs text-muted-foreground">
                  From {summary.lateCount} late payment
                  {summary.lateCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {contributions.some((c) => c.paidAt) && (
              <>
                <Separator className="my-4" />
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Payment timing
                  </p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span>
                        {
                          contributions.filter((c) => {
                            if (!c.paidAt) return false
                            const d = new Date(c.paidAt)
                            return isWithinInterval(d, {
                              start: windowStart,
                              end: windowEnd,
                            })
                          }).length
                        }{" "}
                        paid within window
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-amber-500" />
                      <span>
                        {
                          contributions.filter((c) => {
                            if (!c.paidAt) return false
                            const d = new Date(c.paidAt)
                            return !isWithinInterval(d, {
                              start: windowStart,
                              end: windowEnd,
                            })
                          }).length
                        }{" "}
                        paid outside window
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-zinc-300" />
                      <span>
                        {contributions.filter((c) => !c.paidAt).length} no
                        payment date recorded
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
