"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { siteConfig } from "@/constants/site-config"
import { addMonths, format, parse } from "date-fns"
import { motion, useReducedMotion } from "framer-motion"
import {
  AlertCircle,
  Banknote,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock,
  HandCoins,
  Landmark,
  Mail,
  ScrollText,
  ShieldCheck,
  Users,
} from "lucide-react"

import { getDynamicGreeting } from "@/lib/greeting"
import { useAdminDashboard } from "@/hooks/api/use-admin-dashboard"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { DatabaseHealthCard } from "./database-health-card"
import { StatCard } from "./stat-card"

const currencyFormatter = new Intl.NumberFormat("en-RW", {
  style: "currency",
  currency: "RWF",
  maximumFractionDigits: 0,
})

const numberFormatter = new Intl.NumberFormat("en-RW")

function formatRwf(value: number) {
  return currencyFormatter.format(value || 0)
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
  trackClassName = "h-3 rounded-full bg-emerald-100",
  barClassName = "h-3 rounded-full bg-emerald-500",
}: {
  percent: number
  delay?: number
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

export function AdminDashboardContent() {
  const [mounted, setMounted] = useState(false)
  const { data, isLoading, error, refetch } = useAdminDashboard()
  const [greeting, setGreeting] = useState("Welcome Back")
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    setGreeting(getDynamicGreeting())
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  const formatDate = (value?: string | null) => {
    if (!value) return "Not scheduled"
    return new Date(value).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const platformRules = useMemo(
    () => [
      {
        label: "Monthly contribution",
        value: formatRwf(siteConfig.platform.savings.monthlyContributionRwf),
        icon: HandCoins,
      },
      {
        label: "Loan cap",
        value: `${siteConfig.platform.loans.maxLoanToSavingsRatio}x savings`,
        icon: Landmark,
      },
      {
        label: "Interest rate",
        value: `${Math.round(siteConfig.platform.loans.interestRate * 100)}%`,
        icon: Banknote,
      },
      {
        label: "Audit cadence",
        value: `Every ${siteConfig.platform.meetings.auditCadenceMonths} months`,
        icon: ShieldCheck,
      },
    ],
    []
  )

  if (!mounted) {
    return <AdminDashboardSkeleton />
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load admin dashboard data. Please try again.
          <button
            onClick={() => refetch()}
            className="ml-2 underline hover:no-underline">
            Retry
          </button>
        </AlertDescription>
      </Alert>
    )
  }

  if (isLoading || !data) {
    return <AdminDashboardSkeleton />
  }

  const {
    stats,
    contributions,
    loans,
    meetings,
    actionItems,
    announcements,
    messages,
    window: contributionWindow,
    health,
  } = data.data

  const totalOutstanding =
    stats.contributions.pendingCount + stats.contributions.lateCount
  const quorumTarget = Math.ceil(
    stats.members.total * siteConfig.platform.governance.quorumRatio
  )
  const monthlyContributionTarget =
    siteConfig.platform.savings.monthlyContributionRwf *
    siteConfig.platform.governance.membershipCount
  const totalLoans = Math.max(stats.loans.total, 1)
  const totalContributionCount = Math.max(
    stats.contributions.confirmedCount +
      stats.contributions.pendingCount +
      stats.contributions.lateCount +
      stats.contributions.waivedCount,
    1
  )

  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {greeting}, Admin
          </h2>
          <p className="text-muted-foreground">
            Here's the Ventures pulse for POSSO Ventures.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={contributionWindow.isOpen ? "default" : "secondary"}>
            {contributionWindow.isOpen
              ? "Contribution window open"
              : "Window closed"}
          </Badge>
          <Badge variant="outline">{contributionWindow.label}</Badge>
          <Badge variant="outline">
            Period: {contributionWindow.period.replace("-", " ")}
          </Badge>
          <Badge variant="outline">
            {contributionWindow.isOpen
              ? `${contributionWindow.daysRemaining} days left`
              : `${contributionWindow.daysUntilNext} days until open`}
          </Badge>
        </div>
      </div>

      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="finance">Finance</TabsTrigger>
        <TabsTrigger value="governance">Governance</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Contributions this period"
            value={formatRwf(stats.contributions.thisMonthAmount)}
            icon={HandCoins}
            description={`${stats.contributions.collectionRate}% of target`}
          />
          <StatCard
            title="Outstanding contributions"
            value={totalOutstanding}
            icon={Clock}
            description={formatRwf(stats.contributions.outstandingAmount)}
          />
          <StatCard
            title="Active loans"
            value={
              stats.loans.disbursed + stats.loans.repaying + stats.loans.overdue
            }
            icon={Landmark}
            description={formatRwf(stats.loans.outstandingAmount)}
          />
          <StatCard
            title="Members"
            value={stats.members.total}
            icon={Users}
            description={`Quorum target ${numberFormatter.format(quorumTarget)}`}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2 border-emerald-200/60 bg-linear-to-br from-emerald-50 via-white to-slate-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HandCoins className="h-4 w-4 text-emerald-600" />
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
                  item.total,
                  monthlyContributionTarget
                )
                return (
                  <motion.div
                    key={item.period}
                    className="space-y-2"
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
                          {formatRwf(item.total)}
                        </span>
                        <span className="text-[11px] font-medium tabular-nums text-emerald-700/80">
                          {percent.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <AnimatedMetricBar
                      percent={percent}
                      delay={index * 0.08}
                      tooltipLabel={`${item.month} (${item.period}) - ${formatRwf(item.total)}`}
                    />
                  </motion.div>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Landmark className="h-4 w-4 text-slate-600" />
                Loan pipeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(loans.byStatus).map(([status, count]) => (
                <div key={status} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="capitalize text-muted-foreground">
                      {status.replace(/_/g, " ")}
                    </span>
                    <span className="font-semibold tabular-nums">{count}</span>
                  </div>
                  <Progress value={(count / totalLoans) * 100} />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                Next meeting & attendance
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border bg-background p-4">
                <p className="text-xs uppercase text-muted-foreground">
                  Next meeting
                </p>
                <p className="mt-2 text-lg font-semibold">
                  {meetings.upcoming[0]?.title || "No meeting scheduled"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(meetings.upcoming[0]?.scheduledAt)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {meetings.upcoming[0]?.location || "Location to be shared"}
                </p>
              </div>
              <div className="rounded-lg border bg-background p-4">
                <p className="text-xs uppercase text-muted-foreground">
                  Latest attendance
                </p>
                <div className="mt-2 text-2xl font-semibold tabular-nums">
                  {stats.attendance.latestMeetingRate}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.attendance.present} present - {stats.attendance.late}{" "}
                  late
                </p>
                <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Absent</span>
                    <span className="font-semibold tabular-nums">
                      {stats.attendance.absent}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Excused</span>
                    <span className="font-semibold tabular-nums">
                      {stats.attendance.excused}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                Posso Ventures rules
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {platformRules.map((rule) => (
                <div
                  key={rule.label}
                  className="flex items-center justify-between rounded-lg border bg-background px-3 py-2">
                  <div className="flex items-center gap-2">
                    <rule.icon className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs text-muted-foreground">
                      {rule.label}
                    </span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">
                    {rule.value}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/admin/financial/contributions" className="group">
            <Card className="transition-colors group-hover:border-primary/60">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  Contributions
                </CardTitle>
                <HandCoins className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Record and verify member savings
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/financial/loans" className="group">
            <Card className="transition-colors group-hover:border-primary/60">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">Loans</CardTitle>
                <Landmark className="h-4 w-4 text-slate-500" />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Approve, disburse, and track repayments
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/attendance" className="group">
            <Card className="transition-colors group-hover:border-primary/60">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  Attendance
                </CardTitle>
                <CalendarDays className="h-4 w-4 text-sky-500" />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Track meeting participation and quorum
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScrollText className="h-4 w-4 text-muted-foreground" />
                Recent activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No recent activity yet.
                </p>
              ) : (
                stats.activity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 rounded-lg border p-3">
                    <div className="mt-0.5 h-2 w-2 rounded-full bg-emerald-500" />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.description}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(activity.timestamp).toLocaleDateString("en-RW")}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Database health</CardTitle>
            </CardHeader>
            <CardContent>
              <DatabaseHealthCard health={health} />
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="finance" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total contributions"
            value={formatRwf(stats.contributions.totalAmount)}
            icon={HandCoins}
            description={`${stats.contributions.confirmedCount} confirmed`}
          />
          <StatCard
            title="Expected this period"
            value={formatRwf(stats.contributions.expectedThisMonth)}
            icon={Banknote}
            description={`${stats.contributions.collectionRate}% collected`}
          />
          <StatCard
            title="Loans outstanding"
            value={formatRwf(stats.loans.outstandingAmount)}
            icon={Landmark}
            description={`${stats.loans.overdue} overdue`}
          />
          <StatCard
            title="Loan requests"
            value={stats.loans.requested}
            icon={Clock}
            description={`${stats.loans.approved} approved`}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Contribution status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(contributions.byStatus).map(([status, count]) => (
                <div key={status} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="capitalize text-muted-foreground">
                      {status.replace(/_/g, " ")}
                    </span>
                    <span className="font-semibold tabular-nums">{count}</span>
                  </div>
                  <Progress value={(count / totalContributionCount) * 100} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Loan requests vs disbursements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loans.monthly.map((item) => (
                <div key={item.month} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{item.month}</span>
                    <span className="font-semibold tabular-nums">
                      {item.requested} requests
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-emerald-500"
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
        </div>
      </TabsContent>

      <TabsContent value="governance" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Open action items"
            value={stats.actionItems.open}
            icon={CheckCircle2}
            description={`${stats.actionItems.dueSoon} due soon`}
          />
          <StatCard
            title="Announcements"
            value={stats.announcements.published}
            icon={Bell}
            description={`${stats.announcements.draft} drafts`}
          />
          <StatCard
            title="Unread messages"
            value={stats.messages.unread}
            icon={Mail}
            description="Member support queue"
          />
          <StatCard
            title="Upcoming meetings"
            value={stats.meetings.upcoming}
            icon={CalendarDays}
            description={`${stats.meetings.completed} completed`}
          />
        </div>

        <div className="grid  gap-4 lg:grid-cols-3">
          <Card className="">
            <CardHeader>
              <CardTitle>Action items at risk</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {actionItems.urgent.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No action items due soon.
                </p>
              ) : (
                actionItems.urgent.map((item) => (
                  <div key={item.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{item.title}</p>
                      <Badge variant="outline" className="capitalize">
                        {item.priority.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Due {formatDate(item.dueDate)}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Latest announcements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {announcements.recent.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No announcements yet.
                </p>
              ) : (
                announcements.recent.map((item) => (
                  <div key={item.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between text-sm">
                      <p className="font-medium">{item.title}</p>
                      <Badge variant="secondary" className="capitalize">
                        {item.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.publishedAt
                        ? new Date(item.publishedAt).toLocaleDateString("en-RW")
                        : "Draft"}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="">
            <CardHeader>
              <CardTitle>Recent messages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 ">
              {messages.recent.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No messages in the queue.
                </p>
              ) : (
                messages.recent.map((item) => (
                  <div key={item.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between text-sm">
                      <p className="font-medium truncate">
                        {item.subject?.slice(0, 23)}
                      </p>
                      <Badge variant="outline" className="capitalize">
                        {item.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.name || "Member"} -{" "}
                      {new Date(item.createdAt).toLocaleDateString("en-RW")}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  )
}

function AdminDashboardSkeleton() {
  return (
    <div className="space-y-4">
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
          <CardContent>
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
