"use client"

import { useEffect, useState } from "react"
import { siteConfig } from "@/constants/site-config"
import { addMonths, format, parse } from "date-fns"
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock,
  HandCoins,
  Landmark,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react"

import { useAdminDashboard } from "@/hooks/api/use-admin-dashboard"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

function formatPeriodWindow(period: string): string {
  const { contributionWindow } = siteConfig.platform.savings
  const periodDate = parse(period, "yyyy-MM", new Date())
  const nextMonth = addMonths(periodDate, 1)
  const windowStart = new Date(
    periodDate.getFullYear(),
    periodDate.getMonth(),
    contributionWindow.startDay
  )
  const windowEnd = new Date(
    nextMonth.getFullYear(),
    nextMonth.getMonth(),
    contributionWindow.endDay
  )
  return `${format(windowStart, "MMM d")} – ${format(windowEnd, "MMM d")}`
}

function getPercent(value: number, max: number) {
  if (max <= 0) return 0
  return Math.min((value / max) * 100, 100)
}

function HealthStatusBadge({
  status,
}: {
  status: "healthy" | "warning" | "critical"
}) {
  if (status === "healthy")
    return (
      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
        <CheckCircle2 className="mr-1 h-3 w-3" /> Healthy
      </Badge>
    )
  if (status === "warning")
    return (
      <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
        <AlertTriangle className="mr-1 h-3 w-3" /> Warning
      </Badge>
    )
  return (
    <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
      <XCircle className="mr-1 h-3 w-3" /> Critical
    </Badge>
  )
}

function MetricRow({
  label,
  value,
  status,
  hint,
}: {
  label: string
  value: string | number
  status: "healthy" | "warning" | "critical"
  hint?: string
}) {
  const icon =
    status === "healthy" ? (
      <CheckCircle2 className="h-4 w-4 text-green-500" />
    ) : status === "warning" ? (
      <AlertTriangle className="h-4 w-4 text-yellow-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    )

  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <p className="text-sm font-medium">{label}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </div>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  )
}

export function PresidentHealthContent() {
  const [mounted, setMounted] = useState(false)
  const { data, isLoading, error, refetch, isFetching } = useAdminDashboard()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || isLoading) return <HealthPageSkeleton />

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load health data. Please try again.
          <button
            onClick={() => refetch()}
            className="ml-2 underline hover:no-underline">
            Retry
          </button>
        </AlertDescription>
      </Alert>
    )
  }

  if (!data) return <HealthPageSkeleton />

  const { stats, contributions, window: contributionWindow } = data.data

  // ── Derived health indicators ─────────────────────────────────────────────

  const monthlyContributionTarget =
    siteConfig.platform.savings.monthlyContributionRwf *
    siteConfig.platform.governance.membershipCount
  const membershipCount = siteConfig.platform.governance.membershipCount

  const collectionRate = Math.min(
    Math.round(
      (stats.contributions.thisMonthAmount /
        Math.max(monthlyContributionTarget, 1)) *
        100
    ),
    100
  )
  const collectionStatus =
    collectionRate >= 80
      ? "healthy"
      : collectionRate >= 50
        ? "warning"
        : "critical"

  const overdueLoans = stats.loans.overdue
  const loanStatus =
    overdueLoans === 0 ? "healthy" : overdueLoans <= 2 ? "warning" : "critical"

  const lateContributions = stats.contributions.lateCount
  const lateStatus =
    lateContributions === 0
      ? "healthy"
      : lateContributions <= 3
        ? "warning"
        : "critical"

  const blockedItems = stats.actionItems.blocked
  const actionStatus =
    blockedItems === 0 ? "healthy" : blockedItems <= 2 ? "warning" : "critical"

  const pendingInvites = stats.members.invitationsPending
  const memberStatus =
    pendingInvites === 0
      ? "healthy"
      : pendingInvites <= 5
        ? "warning"
        : "critical"

  const allStatuses = [
    collectionStatus,
    loanStatus,
    lateStatus,
    actionStatus,
    memberStatus,
  ]
  const overallStatus = allStatuses.includes("critical")
    ? "critical"
    : allStatuses.includes("warning")
      ? "warning"
      : "healthy"

  const currencyFormatter = new Intl.NumberFormat("en-RW", {
    style: "currency",
    currency: "RWF",
    maximumFractionDigits: 0,
  })
  const formatRwf = (v: number) => currencyFormatter.format(v || 0)

  const totalActiveLoans =
    stats.loans.disbursed + stats.loans.repaying + stats.loans.overdue

  const totalContributionCount = Math.max(
    stats.contributions.confirmedCount +
      stats.contributions.pendingCount +
      stats.contributions.lateCount +
      stats.contributions.waivedCount,
    1
  )

  const settledCount =
    stats.contributions.confirmedCount +
    stats.contributions.lateCount +
    stats.contributions.waivedCount

  const currentWindowDates = formatPeriodWindow(contributionWindow.period)

  return (
    <div className="flex-1 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Group Health</h1>
          <p className="text-sm text-muted-foreground">
            Real-time health and risk indicators for TrustLink Group.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <HealthStatusBadge status={overallStatus} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 gap-1.5">
            <RefreshCw
              className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall status banner */}
      {overallStatus !== "healthy" && (
        <Alert
          variant={overallStatus === "critical" ? "destructive" : "default"}
          className={
            overallStatus === "warning"
              ? "border-yellow-200 bg-yellow-50 text-yellow-800"
              : undefined
          }>
          {overallStatus === "critical" ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          )}
          <AlertDescription>
            {overallStatus === "critical"
              ? "One or more critical issues require immediate attention."
              : "Some indicators need your attention - review the details below."}
          </AlertDescription>
        </Alert>
      )}

      {/* Top summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Collection rate
            </CardTitle>
            <HandCoins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {collectionRate}%
            </div>
            <Progress value={collectionRate} className="mt-2 h-2" />
            <p className="mt-1 text-xs text-muted-foreground">
              {formatRwf(stats.contributions.thisMonthAmount)} of{" "}
              {formatRwf(monthlyContributionTarget)} target
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {currentWindowDates} · {settledCount}/{membershipCount} settled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Loan portfolio
            </CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {totalActiveLoans}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Active - {formatRwf(stats.loans.outstandingAmount)} outstanding
            </p>
            {overdueLoans > 0 && (
              <p className="mt-0.5 text-xs font-medium text-red-600">
                {overdueLoans} overdue
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Contribution window
            </CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {contributionWindow.isOpen ? "Open" : "Closed"}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {contributionWindow.label}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {contributionWindow.isOpen
                ? `${contributionWindow.daysRemaining} days remaining`
                : `Opens in ${contributionWindow.daysUntilNext} days`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Governance health checks (full-width, no DB section) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" />
            Group health checks
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <MetricRow
            label="Contribution collection"
            value={`${collectionRate}%`}
            status={collectionStatus}
            hint="Target: ≥80% of expected this period"
          />
          <MetricRow
            label="Overdue loans"
            value={overdueLoans}
            status={loanStatus}
            hint="Loans past repayment deadline"
          />
          <MetricRow
            label="Late contributions"
            value={lateContributions}
            status={lateStatus}
            hint="Members with overdue payments"
          />
          <MetricRow
            label="Blocked action items"
            value={blockedItems}
            status={actionStatus}
            hint="Items stuck and unresolved"
          />
          <MetricRow
            label="Pending invitations"
            value={pendingInvites}
            status={memberStatus}
            hint="Members yet to accept invitation"
          />
        </CardContent>
      </Card>

      {/* Contribution + Loan breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HandCoins className="h-4 w-4 text-emerald-600" />
              Contribution breakdown
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {contributionWindow.label} · {currentWindowDates}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Member settlement progress */}
            <div className="rounded-lg border bg-emerald-50/60 p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-emerald-900">
                  {settledCount} / {membershipCount} members settled
                </span>
                <span className="tabular-nums font-bold text-emerald-800">
                  {collectionRate}%
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-emerald-100">
                <div
                  className="h-2.5 rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${collectionRate}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {formatRwf(stats.contributions.thisMonthAmount)} collected
                </span>
                <span>Target {formatRwf(monthlyContributionTarget)}</span>
              </div>
            </div>

            {/* Status breakdown with colour coding */}
            {Object.entries(contributions.byStatus).map(([status, cnt]) => {
              const barColors: Record<string, string> = {
                confirmed: "bg-emerald-500",
                late: "bg-amber-500",
                pending: "bg-slate-300",
                waived: "bg-sky-400",
              }
              const dotColors: Record<string, string> = {
                confirmed: "bg-emerald-500",
                late: "bg-amber-500",
                pending: "bg-slate-400",
                waived: "bg-sky-400",
              }
              const bar = barColors[status] ?? "bg-slate-300"
              const dot = dotColors[status] ?? "bg-slate-400"
              const pct = getPercent(cnt, membershipCount)
              return (
                <div key={status} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${dot}`} />
                      <span className="capitalize text-muted-foreground">
                        {status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <span className="font-semibold tabular-nums">
                      {cnt}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        ({Math.round(pct)}%)
                      </span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className={`h-2 rounded-full ${bar}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}

            <Separator className="my-1" />

            {/* 6-period momentum */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Last 6 periods
              </p>
              {contributions.monthly.map((item) => {
                const pct = getPercent(item.total, monthlyContributionTarget)
                return (
                  <div key={item.period} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {item.month}
                      </span>
                      <span className="tabular-nums font-medium">
                        {formatRwf(item.total)}{" "}
                        <span className="text-[10px] text-emerald-700/80">
                          {pct.toFixed(1)}%
                        </span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-emerald-100">
                      <div
                        className="h-1.5 rounded-full bg-emerald-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            <Separator className="my-1" />

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xs text-muted-foreground">Outstanding</p>
                <p className="mt-1 text-sm font-bold tabular-nums text-red-600">
                  {formatRwf(stats.contributions.outstandingAmount)}
                </p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xs text-muted-foreground">
                  All-time collected
                </p>
                <p className="mt-1 text-sm font-bold tabular-nums text-green-600">
                  {formatRwf(stats.contributions.totalAmount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Landmark className="h-4 w-4 text-slate-600" />
              Loan portfolio health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              {
                label: "Requested",
                value: stats.loans.requested,
                icon: Clock,
                color: "text-yellow-600",
              },
              {
                label: "Approved",
                value: stats.loans.approved,
                icon: CheckCircle2,
                color: "text-blue-600",
              },
              {
                label: "Disbursed",
                value: stats.loans.disbursed,
                icon: Banknote,
                color: "text-emerald-600",
              },
              {
                label: "Repaying",
                value: stats.loans.repaying,
                icon: TrendingUp,
                color: "text-emerald-600",
              },
              {
                label: "Overdue",
                value: stats.loans.overdue,
                icon: TrendingDown,
                color: "text-red-600",
              },
              {
                label: "Repaid",
                value: stats.loans.repaid,
                icon: CheckCircle2,
                color: "text-slate-500",
              },
            ].map(({ label, value, icon: Icon, color }) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${color}`} />
                  <span className="text-sm text-muted-foreground">{label}</span>
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  {value}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Member + Governance risk */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Membership status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm text-muted-foreground">
                Total members
              </span>
              <span className="text-sm font-semibold tabular-nums">
                {stats.members.total}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm text-muted-foreground">
                Active members
              </span>
              <span className="text-sm font-semibold tabular-nums">
                {stats.members.active}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                {pendingInvites > 0 ? (
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
                <span className="text-sm text-muted-foreground">
                  Pending invitations
                </span>
              </div>
              <span className="text-sm font-semibold tabular-nums">
                {pendingInvites}
              </span>
            </div>
            {Object.entries(stats.members.byRole).length > 0 && (
              <>
                <Separator />
                <p className="text-xs font-medium text-muted-foreground">
                  By role
                </p>
                {Object.entries(stats.members.byRole).map(([role, count]) => (
                  <div
                    key={role}
                    className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <span className="text-sm capitalize text-muted-foreground">
                      {role}
                    </span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-4 w-4" />
              Governance risk indicators
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Open action items
                </span>
              </div>
              <span className="text-sm font-semibold tabular-nums">
                {stats.actionItems.open}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">
                  In progress
                </span>
              </div>
              <span className="text-sm font-semibold tabular-nums">
                {stats.actionItems.inProgress}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                {blockedItems > 0 ? (
                  <XCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
                <span className="text-sm text-muted-foreground">Blocked</span>
              </div>
              <span className="text-sm font-semibold tabular-nums">
                {blockedItems}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                {stats.actionItems.dueSoon > 0 ? (
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
                <span className="text-sm text-muted-foreground">Due soon</span>
              </div>
              <span className="text-sm font-semibold tabular-nums">
                {stats.actionItems.dueSoon}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Upcoming meetings
                </span>
              </div>
              <span className="text-sm font-semibold tabular-nums">
                {stats.meetings.upcoming}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Completed meetings
                </span>
              </div>
              <span className="text-sm font-semibold tabular-nums">
                {stats.meetings.completed}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Latest attendance rate
                </span>
              </div>
              <span className="text-sm font-semibold tabular-nums">
                {stats.attendance.latestMeetingRate}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function HealthPageSkeleton() {
  return (
    <div className="flex-1 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
              <Skeleton className="mt-2 h-2 w-full" />
              <Skeleton className="mt-2 h-3 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[...Array(5)].map((_, j) => (
                <Skeleton key={j} className="h-12 w-full rounded-lg" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
