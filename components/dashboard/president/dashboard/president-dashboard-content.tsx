"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { siteConfig } from "@/constants/site-config"
import { addMonths, format, parse } from "date-fns"
import { motion, useReducedMotion } from "framer-motion"
import {
  AlertCircle,
  Award,
  Banknote,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  Landmark,
  ScrollText,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react"

import { getDynamicGreeting } from "@/lib/greeting"
import { usePresidentDashboard } from "@/hooks/api/use-president-dashboard"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
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
  if (!value) return "Not scheduled"
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
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
  delay = 0,
  tooltipLabel,
}: {
  percent: number
  delay?: number
  tooltipLabel: string
}) {
  const prefersReducedMotion = useReducedMotion()
  const clampedPercent = Math.max(0, Math.min(percent, 100))

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="h-3 rounded-full bg-emerald-100">
          <motion.div
            className="h-3 rounded-full bg-emerald-500"
            initial={prefersReducedMotion ? false : { width: 0 }}
            whileInView={{ width: `${clampedPercent}%` }}
            viewport={{ once: true, amount: 0.6 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: 0.8, ease: "easeOut", delay }
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

const priorityColors: Record<string, string> = {
  high: "border-red-200 bg-red-50 text-red-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  low: "border-slate-200 bg-slate-50 text-slate-600",
  urgent: "border-red-300 bg-red-100 text-red-800",
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  iconColor = "text-muted-foreground",
}: {
  title: string
  value: string | number
  icon: any
  description?: string
  iconColor?: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}

export function PresidentDashboardContent() {
  const [mounted, setMounted] = useState(false)
  const [greeting, setGreeting] = useState("Welcome Back")
  const { data, isLoading, error, refetch } = usePresidentDashboard()
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    setMounted(true)
    setGreeting(getDynamicGreeting())
  }, [])

  if (!mounted || isLoading || !data) {
    return <PresidentDashboardSkeleton />
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load dashboard data. Please try again.
          <button
            onClick={() => refetch()}
            className="ml-2 underline hover:no-underline">
            Retry
          </button>
        </AlertDescription>
      </Alert>
    )
  }

  const {
    president,
    stats,
    leadership,
    meetings,
    actionItems,
    announcements,
    pendingAuthorizations,
    contributions,
  } = data.data

  const termStart = new Date(leadership.termStart)
  const termEnd = new Date(leadership.termEnd)
  const termProgress = Math.min(
    100,
    Math.round(
      ((Date.now() - termStart.getTime()) /
        (termEnd.getTime() - termStart.getTime())) *
        100
    )
  )
  const monthlyContributionTarget =
    siteConfig.platform.savings.monthlyContributionRwf *
    siteConfig.platform.governance.membershipCount

  return (
    <Tabs defaultValue="overview" className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {greeting}, President
          </h2>
          <p className="text-muted-foreground">
            Here&apos;s the governance pulse for TrustLink Group.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/president/meetings">
            <Button size="sm">
              <CalendarDays className="mr-2 h-4 w-4" />
              Chair Meeting
            </Button>
          </Link>
          <Link href="/president/announcements">
            <Button size="sm" variant="outline">
              Post Announcement
            </Button>
          </Link>
        </div>
      </div>

      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="governance">Governance</TabsTrigger>
        <TabsTrigger value="finance">Finance</TabsTrigger>
      </TabsList>

      {/* ── Overview tab ── */}
      <TabsContent value="overview" className="space-y-4">
        {/* KPI cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Next Meeting"
            value={
              stats.nextMeeting
                ? formatDateTime(stats.nextMeeting.scheduledAt)
                : "Not scheduled"
            }
            icon={Calendar}
            description={stats.nextMeeting?.location || "Location TBD"}
            iconColor="text-purple-500"
          />
          <StatCard
            title="Pending Loan Requests"
            value={stats.pendingLoanRequests}
            icon={Shield}
            description="Awaiting authorization"
            iconColor="text-amber-500"
          />
          <StatCard
            title="Active Members"
            value={`${stats.activeMemberCount} / ${stats.totalMembers}`}
            icon={Users}
            description="Members in good standing"
            iconColor="text-blue-500"
          />
          <StatCard
            title="Open Action Items"
            value={stats.openActionItems}
            icon={CheckCircle2}
            description="From meeting minutes"
            iconColor="text-emerald-500"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Pending Authorizations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Pending Your Authorization
              </CardTitle>
              {stats.pendingLoanRequests > 0 ? (
                <Badge
                  variant="outline"
                  className="border-amber-300 bg-amber-50 text-amber-700">
                  {stats.pendingLoanRequests} Pending
                </Badge>
              ) : (
                <Badge variant="secondary">All clear</Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingAuthorizations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No pending loan requests at this time.
                </p>
              ) : (
                pendingAuthorizations.map((loan) => (
                  <div key={loan.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">Loan Request</p>
                        <p className="text-xs text-muted-foreground">
                          {loan.memberName} - {formatRwf(loan.requestedAmount)}
                          {loan.termMonths ? ` · ${loan.termMonths}mo` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Requested {formatDate(loan.requestedAt)}
                        </p>
                      </div>
                      <Link href="/president/loans">
                        <Button size="sm">Review</Button>
                      </Link>
                    </div>
                  </div>
                ))
              )}
              <Link href="/president/loans">
                <Button variant="outline" className="w-full" size="sm">
                  View All Loan Requests
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Leadership Term */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Leadership Term
              </CardTitle>
              <Award className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Term Start</p>
                  <p className="font-medium">
                    {formatDate(leadership.termStart)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Term End</p>
                  <p className="font-medium">
                    {formatDate(leadership.termEnd)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Consecutive Terms</p>
                  <p className="font-medium">1 of 2 allowed</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Days Remaining</p>
                  <p className="font-medium tabular-nums">
                    {leadership.daysRemaining} days
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Term progress</span>
                  <span>{termProgress}%</span>
                </div>
                <Progress value={termProgress} className="h-2" />
              </div>
              <Separator />
              <p className="text-xs text-muted-foreground">
                Per the constitution, leaders may serve a maximum of 2
                consecutive {leadership.leadershipTermMonths}-month terms.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Financial Snapshot */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Financial Snapshot
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3 text-sm">
            <div className="rounded-md border p-3 space-y-1">
              <p className="text-muted-foreground">Total Group Savings</p>
              <p className="text-xl font-semibold tabular-nums">
                {formatRwf(stats.finance.totalSavings)}
              </p>
              <p className="text-xs text-muted-foreground">
                {stats.finance.collectionRate}% collected this period
              </p>
            </div>
            <div className="rounded-md border p-3 space-y-1">
              <p className="text-muted-foreground">Active Loans</p>
              <p className="text-xl font-semibold tabular-nums">
                {formatRwf(stats.finance.activeLoanAmount)}
              </p>
              <p className="text-xs text-muted-foreground">
                {stats.overdueLoans} overdue
              </p>
            </div>
            <div className="rounded-md border p-3 space-y-1">
              <p className="text-muted-foreground">Penalty Fund</p>
              <p className="text-xl font-semibold tabular-nums">
                {formatRwf(stats.finance.penaltyFundAmount)}
              </p>
              <p className="text-xs text-muted-foreground">
                {stats.activePenalties} active
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick links */}
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/president/meetings" className="group">
            <Card className="transition-colors group-hover:border-primary/60">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">Meetings</CardTitle>
                <CalendarDays className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Chair sessions and approve minutes
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/president/loans" className="group">
            <Card className="transition-colors group-hover:border-primary/60">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  Loan Requests
                </CardTitle>
                <Landmark className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Review and authorize disbursements
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/president/health" className="group">
            <Card className="transition-colors group-hover:border-primary/60">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  Group Health
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Monitor compliance and indicators
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </TabsContent>

      {/* ── Governance tab ── */}
      <TabsContent value="governance" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Open Action Items"
            value={stats.openActionItems}
            icon={CheckCircle2}
            description="Across all meetings"
            iconColor="text-emerald-500"
          />
          <StatCard
            title="Upcoming Meetings"
            value={meetings.upcoming.length}
            icon={CalendarDays}
            description={
              meetings.upcoming[0]
                ? formatDateTime(meetings.upcoming[0].scheduledAt)
                : "None scheduled"
            }
            iconColor="text-purple-500"
          />
          <StatCard
            title="Recent Announcements"
            value={announcements.recent.length}
            icon={ScrollText}
            description="Published to members"
            iconColor="text-blue-500"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Action items at risk */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                High-Priority Items
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {actionItems.urgent.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No high-priority items at this time.
                </p>
              ) : (
                actionItems.urgent.map((item) => (
                  <div key={item.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium leading-snug">{item.title}</p>
                      <Badge
                        variant="outline"
                        className={`shrink-0 capitalize text-xs ${priorityColors[item.priority] ?? ""}`}>
                        {item.priority}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Due {formatDate(item.dueDate)}
                    </p>
                  </div>
                ))
              )}
              <Link href="/president/meetings">
                <Button variant="outline" size="sm" className="w-full">
                  View All Action Items
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Upcoming meetings */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                Upcoming Meetings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {meetings.upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No meetings scheduled.
                </p>
              ) : (
                meetings.upcoming.map((m) => (
                  <div key={m.id} className="rounded-lg border p-3">
                    <p className="text-sm font-medium">{m.title}</p>
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
              <Link href="/president/meetings">
                <Button variant="outline" size="sm" className="w-full">
                  Manage Meetings
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Recent announcements */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ScrollText className="h-4 w-4 text-muted-foreground" />
                Latest Announcements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {announcements.recent.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No announcements yet.
                </p>
              ) : (
                announcements.recent.map((a) => (
                  <div key={a.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <p className="font-medium truncate">{a.title}</p>
                      <Badge
                        variant="secondary"
                        className="shrink-0 capitalize text-xs">
                        {a.audience || "members"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {a.publishedAt ? formatDate(a.publishedAt) : "Draft"}
                    </p>
                  </div>
                ))
              )}
              <Link href="/president/announcements">
                <Button variant="outline" size="sm" className="w-full">
                  Post Announcement
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* ── Finance tab ── */}
      <TabsContent value="finance" className="space-y-4">
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
              {formatRwf(stats.finance.fundPosition.balance)}
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
                  +{formatRwf(stats.finance.fundPosition.contributionsIn)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Repayments in</p>
                <p className="font-semibold tabular-nums text-emerald-700">
                  +{formatRwf(stats.finance.fundPosition.repaymentsIn)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Loans out</p>
                <p className="font-semibold tabular-nums text-rose-600">
                  -{formatRwf(stats.finance.fundPosition.loansOut)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Expenses out</p>
                <p className="font-semibold tabular-nums text-rose-600">
                  -{formatRwf(stats.finance.fundPosition.expensesOut)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Group Savings"
            value={formatRwf(stats.finance.totalSavings)}
            icon={Banknote}
            description={`${stats.finance.collectionRate}% collected this period`}
            iconColor="text-emerald-500"
          />
          <StatCard
            title="This Period"
            value={formatRwf(stats.finance.confirmedThisPeriodAmount)}
            icon={TrendingUp}
            description={`of ${formatRwf(stats.finance.expectedThisPeriod)} expected`}
            iconColor="text-blue-500"
          />
          <StatCard
            title="Active Loans"
            value={formatRwf(stats.finance.activeLoanAmount)}
            icon={Landmark}
            description={`${stats.overdueLoans} overdue`}
            iconColor="text-amber-500"
          />
          <StatCard
            title="Penalty Fund"
            value={formatRwf(stats.finance.penaltyFundAmount)}
            icon={Shield}
            description={`${stats.activePenalties} active penalties`}
            iconColor="text-red-500"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Contribution momentum */}
          <Card className="border-emerald-200/60 bg-linear-to-br from-emerald-50 via-white to-slate-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                Contribution momentum (6 periods)
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Organized by contribution windows
              </p>
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
                    className="space-y-1"
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
                        <span className="text-muted-foreground">
                          {item.month}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {dateRange}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="font-semibold tabular-nums">
                          {formatRwf(item.confirmed)}
                        </span>
                        <span className="text-[11px] font-medium tabular-nums text-emerald-700/80">
                          {percent.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <AnimatedMetricBar
                      percent={percent}
                      delay={index * 0.08}
                      tooltipLabel={`${item.month} (${item.period}) - ${formatRwf(item.confirmed)}`}
                    />
                  </motion.div>
                )
              })}
            </CardContent>
          </Card>

          {/* Pending loan requests */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Loan Requests
              </CardTitle>
              {stats.pendingLoanRequests > 0 && (
                <Badge
                  variant="outline"
                  className="border-amber-300 bg-amber-50 text-amber-700">
                  {stats.pendingLoanRequests} pending
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingAuthorizations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No pending requests.
                </p>
              ) : (
                pendingAuthorizations.map((loan) => (
                  <div
                    key={loan.id}
                    className="flex items-center justify-between rounded-lg border p-3 text-sm">
                    <div>
                      <p className="font-medium">{loan.memberName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatRwf(loan.requestedAmount)}
                        {loan.termMonths ? ` · ${loan.termMonths} months` : ""}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(loan.requestedAt)}
                    </p>
                  </div>
                ))
              )}
              <Link href="/president/loans">
                <Button variant="outline" size="sm" className="w-full">
                  View All Requests
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  )
}

function PresidentDashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-36" />
        </div>
      </div>
      <Skeleton className="h-10 w-72" />
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
      <div className="grid gap-4 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-40 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
