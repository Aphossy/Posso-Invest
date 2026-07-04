"use client"

import { useEffect, useState } from "react"
import type { Route } from "next"
import Link from "next/link"
import { siteConfig } from "@/constants/site-config"
import { addMonths, format, parse } from "date-fns"
import { motion, useReducedMotion } from "framer-motion"
import {
  AlertCircle,
  AlertTriangle,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  HandCoins,
  Landmark,
  Receipt,
  ShieldCheck,
  TrendingUp,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react"

import { getDynamicGreeting } from "@/lib/greeting"
import { useTreasurerDashboard } from "@/hooks/api/use-treasurer-dashboard"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const currencyFormatter = new Intl.NumberFormat("en-RW", {
  style: "currency",
  currency: "RWF",
  maximumFractionDigits: 0,
})

const statusColorMap: Record<string, string> = {
  confirmed: "text-emerald-600 bg-emerald-50 border-emerald-200",
  pending: "text-amber-600 bg-amber-50 border-amber-200",
  late: "text-red-600 bg-red-50 border-red-200",
  waived: "text-slate-500 bg-slate-50 border-slate-200",
  active: "text-red-600 bg-red-50 border-red-200",
  requested: "text-blue-600 bg-blue-50 border-blue-200",
  approved: "text-emerald-600 bg-emerald-50 border-emerald-200",
  disbursed: "text-cyan-600 bg-cyan-50 border-cyan-200",
  repaying: "text-indigo-600 bg-indigo-50 border-indigo-200",
  overdue: "text-red-600 bg-red-50 border-red-200",
  repaid: "text-emerald-700 bg-emerald-50 border-emerald-200",
}

function formatRwf(value: number) {
  return currencyFormatter.format(value || 0)
}

function formatDate(value?: string | null) {
  if (!value) return "-"
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatDateTime(value?: string | null) {
  if (!value) return "-"
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function StatusBadge({ status }: { status: string }) {
  const classes =
    statusColorMap[status] ?? "text-slate-600 bg-slate-50 border-slate-200"
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${classes}`}>
      {status.replace(/_/g, " ")}
    </span>
  )
}

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

  return `${format(windowStart, "MMM d")} - ${format(windowEnd, "MMM d")}`
}

function getPercent(value: number, max: number) {
  if (max <= 0) return 0
  return Math.min((value / max) * 100, 100)
}

function AnimatedMetricBar({
  percent,
  tooltipLabel,
  trackClassName = "h-2.5 rounded-full bg-emerald-100",
  barClassName = "h-2.5 rounded-full bg-emerald-500",
}: {
  percent: number
  tooltipLabel: string
  trackClassName?: string
  barClassName?: string
}) {
  const prefersReducedMotion = useReducedMotion()
  const clampedPercent = Math.max(0, Math.min(percent, 100))

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={trackClassName}>
          <motion.div
            className={barClassName}
            initial={prefersReducedMotion ? false : { width: 0 }}
            animate={{ width: `${clampedPercent}%` }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: 0.8, ease: "easeOut" }
            }
          />
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <p>{tooltipLabel}</p>
        <p className="font-semibold tabular-nums">
          {clampedPercent.toFixed(1)}%
        </p>
      </TooltipContent>
    </Tooltip>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  iconColor = "text-muted-foreground",
  href,
}: {
  title: string
  value: string | number
  icon: LucideIcon
  description?: string
  iconColor?: string
  href?: Route
}) {
  const inner = (
    <Card className={href ? "transition-colors hover:border-primary/60" : ""}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  )
  if (href) return <Link href={href}>{inner}</Link>
  return inner
}

export function TreasurerDashboardContent() {
  const [mounted, setMounted] = useState(false)
  const [greeting, setGreeting] = useState("Welcome Back")
  const [isPendingRequestsAlertVisible, setIsPendingRequestsAlertVisible] =
    useState(true)
  const [isPendingRequestsAlertCollapsed, setIsPendingRequestsAlertCollapsed] =
    useState(false)
  const [isOverdueAlertVisible, setIsOverdueAlertVisible] = useState(true)
  const [isOverdueAlertCollapsed, setIsOverdueAlertCollapsed] = useState(false)
  const { data, isLoading, error, refetch } = useTreasurerDashboard()

  useEffect(() => {
    setMounted(true)
    setGreeting(getDynamicGreeting())
  }, [])

  const prefersReducedMotion = useReducedMotion()

  const pendingRequestsCount = data?.data.stats.loans.pendingRequests ?? 0
  const overdueLoansCount = data?.data.stats.loans.overdue ?? 0

  useEffect(() => {
    if (!pendingRequestsCount) return
    setIsPendingRequestsAlertVisible(true)
    setIsPendingRequestsAlertCollapsed(false)
  }, [pendingRequestsCount])

  useEffect(() => {
    if (!overdueLoansCount) return
    setIsOverdueAlertVisible(true)
    setIsOverdueAlertCollapsed(false)
  }, [overdueLoansCount])

  if (!mounted) return <TreasurerDashboardSkeleton />

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load treasurer dashboard data.{" "}
          <button
            onClick={() => refetch()}
            className="underline hover:no-underline">
            Retry
          </button>
        </AlertDescription>
      </Alert>
    )
  }

  if (isLoading || !data) return <TreasurerDashboardSkeleton />

  const {
    treasurer,
    stats,
    window: cw,
    contributions,
    loans,
    penalties,
    meetings,
    audit,
  } = data.data

  const firstName = treasurer.name?.trim().split(/\s+/)[0] ?? treasurer.email
  const monthlyTarget = siteConfig.platform.savings.monthlyContributionRwf
  const { membershipCount } = siteConfig.platform.governance
  const { auditCadenceMonths } = siteConfig.platform.meetings
  const { interestRate, disbursementDays } = siteConfig.platform.loans

  const monthlyContributionTarget = monthlyTarget * membershipCount
  const totalLoansActive =
    stats.loans.approved + stats.loans.disbursed + stats.loans.repaying

  return (
    <Tabs defaultValue="overview" className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {greeting}, {firstName}!
          </h2>
          <p className="text-muted-foreground">
            Financial overview for TrustLink Group - period{" "}
            <span className="font-medium">{cw.period.replace("-", " ")}</span>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={cw.isOpen ? "default" : "secondary"}>
            {cw.isOpen ? "Window open" : "Window closed"}
          </Badge>
          <Badge variant="outline">{cw.label}</Badge>
          <Badge variant="outline">
            {cw.isOpen
              ? `${cw.daysRemaining}d left`
              : `Opens in ${cw.daysUntilNext}d`}
          </Badge>
        </div>
      </div>

      {/* Action alerts */}
      {pendingRequestsCount > 0 && isPendingRequestsAlertVisible && (
        <Alert variant="info">
          <Clock className="h-4 w-4" />
          <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-tight">
                {pendingRequestsCount} loan{" "}
                {pendingRequestsCount === 1 ? "request" : "requests"} awaiting
                review
              </p>
              {!isPendingRequestsAlertCollapsed && (
                <AlertDescription className="mt-1 text-blue-500!">
                  Disburse within {disbursementDays} days.{" "}
                  <Link
                    href="/treasurer/loans/requests"
                    className="underline hover:no-underline font-medium text-blue-700">
                    Review requests
                  </Link>
                </AlertDescription>
              )}
            </div>
            <div className="flex items-center gap-1 self-start">
              <button
                type="button"
                onClick={() =>
                  setIsPendingRequestsAlertCollapsed((current) => !current)
                }
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground"
                aria-label={
                  isPendingRequestsAlertCollapsed
                    ? "Expand pending requests alert"
                    : "Collapse pending requests alert"
                }>
                {isPendingRequestsAlertCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsPendingRequestsAlertVisible(false)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground"
                aria-label="Close pending requests alert">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Alert>
      )}

      {overdueLoansCount > 0 && isOverdueAlertVisible && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-tight">
                {overdueLoansCount} overdue{" "}
                {overdueLoansCount === 1 ? "loan" : "loans"}
              </p>
              {!isOverdueAlertCollapsed && (
                <AlertDescription className="mt-1">
                  Follow up on overdue repayments to protect group cash flow.{" "}
                  <Link
                    href="/treasurer/loans/repayments"
                    className="underline">
                    Manage repayments
                  </Link>
                </AlertDescription>
              )}
            </div>
            <div className="flex items-center gap-1 self-start">
              <button
                type="button"
                onClick={() =>
                  setIsOverdueAlertCollapsed((current) => !current)
                }
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground"
                aria-label={
                  isOverdueAlertCollapsed
                    ? "Expand overdue loans alert"
                    : "Collapse overdue loans alert"
                }>
                {isOverdueAlertCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsOverdueAlertVisible(false)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground"
                aria-label="Close overdue loans alert">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Alert>
      )}

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href="/treasurer/contributions/window">
            Verify Contribution
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/treasurer/loans/requests">Review Loan Requests</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/treasurer/contributions/penalties">Issue Penalty</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/treasurer/contributions/receipts">Issue Receipt</Link>
        </Button>
      </div>

      <TabsList className="overflow-x-auto">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="contributions">Contributions</TabsTrigger>
        <TabsTrigger value="loans">Loans</TabsTrigger>
        <TabsTrigger value="reports">Reports & Audit</TabsTrigger>
      </TabsList>

      {/* ─── OVERVIEW TAB ─── */}
      <TabsContent value="overview" className="space-y-4 ">
        {/* Collection rate banner */}
        <Card className="border-emerald-200/60 bg-linear-to-r from-emerald-50 via-white to-slate-50">
          <CardContent className="pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Collection rate - {cw.period.replace("-", " ")}
                </p>
                <p className="text-3xl font-bold tabular-nums text-emerald-700">
                  {stats.contributions.collectionRate}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatRwf(stats.contributions.confirmedThisPeriodAmount)} of{" "}
                  {formatRwf(stats.contributions.expectedThisPeriod)} expected ·{" "}
                  {stats.contributions.thisPeriodMembersPaid} of{" "}
                  {membershipCount} members paid
                </p>
              </div>
              <div className="w-full sm:w-56">
                <Progress
                  value={stats.contributions.collectionRate}
                  className="h-3"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Group fund position (cash on hand) */}
        <Card className="border-cyan-200/60 bg-linear-to-br from-cyan-50 via-white to-slate-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Landmark className="h-4 w-4 text-cyan-600" />
              Group fund position
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums text-cyan-700">
              {formatRwf(stats.fundPosition.balance)}
            </p>
            <p className="mb-3 text-xs text-muted-foreground">
              Estimated cash on hand
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">
                  Contributions in
                </p>
                <p className="font-semibold tabular-nums text-emerald-700">
                  +{formatRwf(stats.fundPosition.contributionsIn)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Repayments in</p>
                <p className="font-semibold tabular-nums text-emerald-700">
                  +{formatRwf(stats.fundPosition.repaymentsIn)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Loans out</p>
                <p className="font-semibold tabular-nums text-rose-600">
                  -{formatRwf(stats.fundPosition.loansOut)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Expenses out</p>
                <p className="font-semibold tabular-nums text-rose-600">
                  -{formatRwf(stats.fundPosition.expensesOut)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Collected this period"
            value={formatRwf(stats.contributions.confirmedThisPeriodAmount)}
            icon={Wallet}
            iconColor="text-emerald-500"
            description={`${stats.contributions.thisPeriodMembersPaid} members paid`}
            href="/treasurer/contributions/window"
          />
          <StatCard
            title="Outstanding"
            value={formatRwf(stats.contributions.outstandingAmount)}
            icon={AlertCircle}
            iconColor={
              stats.contributions.outstandingAmount > 0
                ? "text-amber-500"
                : "text-slate-400"
            }
            description={`${stats.contributions.pendingCount + stats.contributions.lateCount} pending / late`}
          />
          <StatCard
            title="Loans outstanding"
            value={formatRwf(stats.loans.outstandingAmount)}
            icon={Landmark}
            iconColor={
              stats.loans.overdue > 0 ? "text-red-500" : "text-indigo-500"
            }
            description={`${totalLoansActive} active · ${stats.loans.overdue} overdue`}
            href="/treasurer/loans/disbursements"
          />
          <StatCard
            title="Active penalties"
            value={formatRwf(stats.penalties.totalActiveAmount)}
            icon={AlertTriangle}
            iconColor={
              stats.penalties.activeCount > 0
                ? "text-amber-500"
                : "text-slate-400"
            }
            description={`${stats.penalties.activeCount} outstanding`}
            href="/treasurer/contributions/penalties"
          />
        </div>

        {/* Contribution momentum by window + loan pipeline */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2 border-emerald-200/60 bg-linear-to-br from-emerald-50 via-white to-slate-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                Contribution momentum (6 periods)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {contributions.monthly.map((item, index) => {
                const dateRange = formatPeriodWindow(item.period)
                const percent = getPercent(
                  item.confirmed,
                  monthlyContributionTarget
                )
                return (
                  <motion.div
                    key={item.period}
                    className="space-y-1.5"
                    initial={
                      prefersReducedMotion ? false : { opacity: 0, y: 8 }
                    }
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={
                      prefersReducedMotion
                        ? { duration: 0 }
                        : { duration: 0.35, delay: index * 0.06 }
                    }>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-foreground">
                          {item.month}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {dateRange}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {item.late > 0 && (
                          <span className="text-xs text-red-500 font-medium">
                            +{formatRwf(item.late)} late
                          </span>
                        )}
                        <span className="font-semibold tabular-nums text-emerald-700">
                          {item.confirmed > 0 ? formatRwf(item.confirmed) : "-"}
                        </span>
                        <span className="text-[11px] font-medium tabular-nums text-emerald-700/80">
                          {percent.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <AnimatedMetricBar
                      percent={percent}
                      tooltipLabel={`${item.month} (${item.period}) - ${formatRwf(item.confirmed)}`}
                    />
                  </motion.div>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Landmark className="h-4 w-4 text-slate-500" />
                Loan pipeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                {
                  label: "Pending review",
                  count: stats.loans.pendingRequests,
                  color: "bg-blue-400",
                },
                {
                  label: "Approved",
                  count: stats.loans.approved,
                  color: "bg-emerald-400",
                },
                {
                  label: "Disbursed",
                  count: stats.loans.disbursed,
                  color: "bg-cyan-400",
                },
                {
                  label: "Repaying",
                  count: stats.loans.repaying,
                  color: "bg-indigo-400",
                },
                {
                  label: "Overdue",
                  count: stats.loans.overdue,
                  color: "bg-red-500",
                },
                {
                  label: "Repaid",
                  count: stats.loans.repaid,
                  color: "bg-slate-300",
                },
              ].map((item) => {
                const total = Math.max(
                  stats.loans.pendingRequests +
                    stats.loans.approved +
                    stats.loans.disbursed +
                    stats.loans.repaying +
                    stats.loans.overdue +
                    stats.loans.repaid,
                  1
                )
                return (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {item.label}
                      </span>
                      <span className="font-semibold tabular-nums">
                        {item.count}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className={`h-2 rounded-full ${item.color}`}
                        style={{
                          width: `${Math.min((item.count / total) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>

        {/* Outstanding + upcoming meetings */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                Outstanding this period
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {contributions.outstandingMembers.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  All members have paid this period!
                </div>
              ) : (
                contributions.outstandingMembers.map((m) => (
                  <div
                    key={m.memberId}
                    className="flex items-center justify-between rounded-lg border p-2.5">
                    <div>
                      <p className="text-sm font-medium">{m.memberName}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.period.replace("-", " ")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">
                        {formatRwf(m.amount)}
                      </p>
                      <StatusBadge status={m.status} />
                    </div>
                  </div>
                ))
              )}
              <Button asChild variant="ghost" size="sm" className="w-full mt-1">
                <Link href="/treasurer/contributions/window">View all</Link>
              </Button>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  Upcoming meetings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {meetings.upcoming.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No meetings scheduled.
                  </p>
                ) : (
                  meetings.upcoming.map((m) => (
                    <div
                      key={m.id}
                      className="rounded-lg border bg-background p-3">
                      <p className="text-sm font-semibold">{m.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(m.scheduledAt)}
                      </p>
                      {m.location && (
                        <p className="text-xs text-muted-foreground">
                          {m.location}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                  Receipts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Issued this period
                  </span>
                  <span className="font-semibold tabular-nums">
                    {stats.receipts.issuedThisPeriod}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">All-time issued</span>
                  <span className="font-semibold tabular-nums">
                    {stats.receipts.totalIssued}
                  </span>
                </div>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="w-full mt-1">
                  <Link href="/treasurer/contributions/receipts">
                    Manage receipts
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </TabsContent>

      {/* ─── CONTRIBUTIONS TAB ─── */}
      <TabsContent value="contributions" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Confirmed (all-time)"
            value={stats.contributions.confirmedCount}
            icon={CheckCircle2}
            iconColor="text-emerald-500"
            description={formatRwf(stats.contributions.totalAllTimeAmount)}
          />
          <StatCard
            title="Pending"
            value={stats.contributions.pendingCount}
            icon={Clock}
            iconColor="text-amber-500"
            description="Awaiting confirmation"
          />
          <StatCard
            title="Late"
            value={stats.contributions.lateCount}
            icon={AlertTriangle}
            iconColor={
              stats.contributions.lateCount > 0
                ? "text-red-500"
                : "text-slate-400"
            }
            description="Past the window"
          />
          <StatCard
            title="Waived"
            value={stats.contributions.waivedCount}
            icon={ShieldCheck}
            iconColor="text-slate-400"
            description="Committee-approved waivers"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Collection by period (confirmed)</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Contribution windows tracked
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {contributions.monthly.map((item, index) => {
                const dateRange = formatPeriodWindow(item.period)
                const percent = getPercent(
                  item.confirmed,
                  monthlyTarget * membershipCount
                )
                return (
                  <motion.div
                    key={item.period}
                    className="space-y-1.5"
                    initial={
                      prefersReducedMotion ? false : { opacity: 0, y: 8 }
                    }
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={
                      prefersReducedMotion
                        ? { duration: 0 }
                        : { duration: 0.35, delay: index * 0.06 }
                    }>
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium text-foreground">
                          {item.month}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {dateRange}
                        </p>
                      </div>
                      <span className="font-semibold tabular-nums text-emerald-600">
                        {item.confirmed > 0 ? formatRwf(item.confirmed) : "-"}
                      </span>
                    </div>
                    <AnimatedMetricBar
                      percent={percent}
                      tooltipLabel={`${item.month} (${item.period}) - ${formatRwf(item.confirmed)} of ${formatRwf(
                        monthlyTarget * membershipCount
                      )}`}
                      trackClassName="h-2 rounded-full bg-emerald-100"
                      barClassName="h-2 rounded-full bg-emerald-500"
                    />
                  </motion.div>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>This period - recent activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {contributions.recent.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No contributions recorded this period.
                </p>
              ) : (
                contributions.recent.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">
                        Period {c.period.replace("-", " ")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {c.paidAt ? formatDate(c.paidAt) : "Not paid"}
                        {c.receiptNumber && ` · #${c.receiptNumber}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">
                        {formatRwf(c.amount)}
                      </p>
                      <StatusBadge status={c.status} />
                    </div>
                  </div>
                ))
              )}
              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link href="/treasurer/contributions/window">
                  View all contributions
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Outstanding members */}
        {contributions.outstandingMembers.length > 0 && (
          <Card className="border-amber-200/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-700">
                <AlertCircle className="h-4 w-4" />
                Members with outstanding payments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {contributions.outstandingMembers.map((m) => (
                <div
                  key={m.memberId}
                  className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                  <div>
                    <p className="text-sm font-medium">{m.memberName}</p>
                    <p className="text-xs text-muted-foreground">
                      Period {m.period.replace("-", " ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums">
                      {formatRwf(m.amount)}
                    </p>
                    <StatusBadge status={m.status} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Active penalties */}
        {penalties.recent.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Active penalties
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {penalties.recent.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Period {p.period.replace("-", " ")}
                    </p>
                    {p.reason && (
                      <p className="text-xs text-muted-foreground">
                        {p.reason}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatDate(p.createdAt)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-red-600 tabular-nums">
                    {formatRwf(p.amount)}
                  </p>
                </div>
              ))}
              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link href="/treasurer/contributions/penalties">
                  Manage penalties
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* ─── LOANS TAB ─── */}
      <TabsContent value="loans" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Outstanding balance"
            value={formatRwf(stats.loans.outstandingAmount)}
            icon={Banknote}
            iconColor="text-indigo-500"
            description={`${totalLoansActive} active loans`}
          />
          <StatCard
            title="Pending requests"
            value={stats.loans.pendingRequests}
            icon={Clock}
            iconColor={
              stats.loans.pendingRequests > 0
                ? "text-amber-500"
                : "text-slate-400"
            }
            description={`Disburse within ${disbursementDays} days`}
            href="/treasurer/loans/requests"
          />
          <StatCard
            title="Overdue"
            value={stats.loans.overdue}
            icon={AlertTriangle}
            iconColor={
              stats.loans.overdue > 0 ? "text-red-500" : "text-slate-400"
            }
            description="Requires follow-up"
          />
          <StatCard
            title="Repaid"
            value={stats.loans.repaid}
            icon={CheckCircle2}
            iconColor="text-emerald-500"
            description={`${Math.round(interestRate * 100)}% interest rate`}
          />
        </div>

        {/* Pending requests */}
        {loans.pendingRequests.length > 0 && (
          <Card className="border-blue-200/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                Pending loan requests
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loans.pendingRequests.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50/40 p-3">
                  <div>
                    <p className="text-sm font-medium">
                      {formatRwf(l.requestedAmount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Requested {formatDate(l.requestedAt)}
                      {l.termMonths && ` · ${l.termMonths} months`}
                    </p>
                  </div>
                  <StatusBadge status="requested" />
                </div>
              ))}
              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link href="/treasurer/loans/requests">
                  Review all requests
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Overdue loans */}
        {loans.overdueLoans.length > 0 && (
          <Card className="border-red-200/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-4 w-4" />
                Overdue loans
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loans.overdueLoans.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50/50 p-3">
                  <div>
                    <p className="text-sm font-medium">{l.memberName}</p>
                    <p className="text-xs text-muted-foreground">
                      Due {formatDate(l.dueDate)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-red-600 tabular-nums">
                    {formatRwf(l.amount)}
                  </p>
                </div>
              ))}
              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link href="/treasurer/loans/repayments">
                  Manage repayments
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Monthly loan chart */}
        <Card>
          <CardHeader>
            <CardTitle>Loan requests vs disbursements (6 months)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loans.monthly.map((item) => (
              <div key={item.month} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.month}</span>
                  <span className="font-semibold tabular-nums">
                    {item.requested} requested · {item.disbursed} disbursed
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-indigo-500"
                    style={{
                      width: `${Math.min(
                        (item.disbursed / Math.max(item.requested, 1)) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ─── REPORTS & AUDIT TAB ─── */}
      <TabsContent value="reports" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="All-time savings"
            value={formatRwf(stats.contributions.totalAllTimeAmount)}
            icon={Wallet}
            iconColor="text-emerald-500"
            description={`${stats.contributions.confirmedCount} confirmed payments`}
          />
          <StatCard
            title="Receipts issued"
            value={stats.receipts.totalIssued}
            icon={Receipt}
            iconColor="text-slate-500"
            description={`${stats.receipts.issuedThisPeriod} this period`}
            href="/treasurer/contributions/receipts"
          />
          <StatCard
            title="Days to next audit"
            value={audit.daysToAudit}
            icon={ShieldCheck}
            iconColor={
              audit.daysToAudit < 14 ? "text-amber-500" : "text-slate-400"
            }
            description={`Every ${auditCadenceMonths} months · next ~${new Date(audit.nextAuditApprox).toLocaleDateString(undefined, { month: "short", year: "numeric" })}`}
          />
        </div>

        <Card className="border-indigo-200/60 bg-linear-to-br from-indigo-50 via-white to-slate-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-indigo-600" />
              Upcoming audit preparation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The next Ikimina audit is in approximately{" "}
              <span className="font-semibold text-foreground">
                {audit.daysToAudit} days
              </span>{" "}
              (~
              {new Date(audit.nextAuditApprox).toLocaleDateString(undefined, {
                month: "long",
                year: "numeric",
              })}
              ). Compile all contribution receipts, loan records, and meeting
              expense summaries for the {auditCadenceMonths}-month review.
            </p>

            <div className="grid gap-2 sm:grid-cols-2">
              {[
                {
                  label: "Confirmed contributions",
                  value: stats.contributions.confirmedCount,
                  icon: HandCoins,
                  color: "text-emerald-600",
                },
                {
                  label: "Pending / late",
                  value:
                    stats.contributions.pendingCount +
                    stats.contributions.lateCount,
                  icon: AlertCircle,
                  color: "text-amber-600",
                },
                {
                  label: "Active penalties",
                  value: stats.penalties.activeCount,
                  icon: AlertTriangle,
                  color: "text-red-500",
                },
                {
                  label: "Receipts issued",
                  value: stats.receipts.totalIssued,
                  icon: Receipt,
                  color: "text-slate-600",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-lg border bg-background p-3">
                  <item.icon className={`h-4 w-4 shrink-0 ${item.color}`} />
                  <span className="flex-1 text-xs text-muted-foreground">
                    {item.label}
                  </span>
                  <span className="text-sm font-semibold tabular-nums">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button asChild variant="outline" size="sm">
                <Link href="/treasurer/reports/monthly">Monthly summary</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/treasurer/reports/audit">Audit report</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/treasurer/contributions/receipts">
                  Export receipts
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/treasurer/documents">Financial documents</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Ikimina platform rules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              Platform financial rules
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {[
              {
                label: "Monthly contribution",
                value: formatRwf(monthlyTarget),
                icon: HandCoins,
              },
              {
                label: "Loan cap",
                value: `${siteConfig.platform.loans.maxLoanToSavingsRatio}× member savings`,
                icon: Landmark,
              },
              {
                label: "Interest rate",
                value: `${Math.round(interestRate * 100)}% p.a.`,
                icon: Banknote,
              },
              {
                label: "Disbursement window",
                value: `${disbursementDays} days`,
                icon: Clock,
              },
              {
                label: "Audit cadence",
                value: `Every ${auditCadenceMonths} months`,
                icon: ShieldCheck,
              },
              {
                label: "Host fee",
                value: formatRwf(
                  siteConfig.platform.meetings.hostContributionRwf
                ),
                icon: CalendarDays,
              },
            ].map((rule) => (
              <div
                key={rule.label}
                className="flex items-center justify-between rounded-lg border bg-background px-3 py-2">
                <div className="flex items-center gap-2">
                  <rule.icon className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-xs text-muted-foreground">
                    {rule.label}
                  </span>
                </div>
                <span className="text-xs font-semibold tabular-nums">
                  {rule.value}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

function TreasurerDashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-20 w-full rounded-lg" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
              <Skeleton className="mt-2 h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-2.5 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
