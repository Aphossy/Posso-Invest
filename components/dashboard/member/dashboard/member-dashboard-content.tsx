"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { siteConfig } from "@/constants/site-config"
import {
  AlertCircle,
  AlertTriangle,
  Banknote,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  HandCoins,
  Landmark,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react"

import { getDynamicGreeting } from "@/lib/greeting"
import { useMemberDashboard } from "@/hooks/api/use-member-dashboard"
import { useProfile } from "@/hooks/use-profile"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
  requested: "text-blue-600 bg-blue-50 border-blue-200",
  approved: "text-emerald-600 bg-emerald-50 border-emerald-200",
  disbursed: "text-cyan-600 bg-cyan-50 border-cyan-200",
  repaying: "text-indigo-600 bg-indigo-50 border-indigo-200",
  overdue: "text-red-600 bg-red-50 border-red-200",
  repaid: "text-emerald-700 bg-emerald-50 border-emerald-200",
  rejected: "text-slate-500 bg-slate-50 border-slate-200",
  present: "text-emerald-600 bg-emerald-50 border-emerald-200",
  absent: "text-red-600 bg-red-50 border-red-200",
  excused: "text-amber-600 bg-amber-50 border-amber-200",
}

function formatRwf(value: number) {
  return currencyFormatter.format(value || 0)
}

function formatDate(value?: string | null) {
  if (!value) return "-"
  return new Date(value).toLocaleString(undefined, {
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
  const classes = statusColorMap[status] ?? "text-slate-600 bg-slate-50"
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${classes}`}>
      {status.replace(/_/g, " ")}
    </span>
  )
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
  icon: LucideIcon
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
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}

type ContributionAlertVariant = "info" | "warning" | "destructive" | "success"

interface ContributionAlertState {
  id: "window-open" | "late" | "paid"
  variant: ContributionAlertVariant
  title: string
  message: string
}

function getContributionAlertState({
  isWindowOpen,
  daysRemaining,
  daysUntilNext,
  thisPeriodStatus,
  thisPeriodAmount,
  monthlyTarget,
  penaltyRate,
}: {
  isWindowOpen: boolean
  daysRemaining: number
  daysUntilNext: number
  thisPeriodStatus: string | null
  thisPeriodAmount: number
  monthlyTarget: number
  penaltyRate: number
}): ContributionAlertState {
  const dayLabel = (count: number) => `${count} day${count === 1 ? "" : "s"}`

  const isContributionSettled =
    thisPeriodStatus === "confirmed" && thisPeriodAmount >= monthlyTarget

  if (isContributionSettled) {
    if (isWindowOpen) {
      return {
        id: "window-open",
        variant: "success",
        title: "Contribution recorded for this window",
        message: `You have completed this cycle. The window closes in ${dayLabel(daysRemaining)}.`,
      }
    }
    return {
      id: "paid",
      variant: "success",
      title: "Contribution already recorded",
      message: `Your ${formatRwf(thisPeriodAmount)} contribution is confirmed for this period.${daysUntilNext > 0 ? ` The next window opens in ${dayLabel(daysUntilNext)}.` : " No action is required now."}`,
    }
  }

  if (isWindowOpen) {
    return {
      id: "window-open",
      variant: "warning",
      title: "Contribution window is open",
      message: `Please contribute ${formatRwf(monthlyTarget)} within ${dayLabel(daysRemaining)} to avoid penalties.`,
    }
  }

  return {
    id: "late",
    variant: "destructive",
    title: "Contribution window has passed",
    message: `Your outstanding contribution is ${formatRwf(monthlyTarget)}. A ${Math.round(penaltyRate * 100)}% late penalty applies until payment is completed.`,
  }
}

export function MemberDashboardContent() {
  const [mounted, setMounted] = useState(false)
  const [greeting, setGreeting] = useState("Welcome Back")
  const [isContributionAlertVisible, setIsContributionAlertVisible] =
    useState(true)
  const [isContributionAlertCollapsed, setIsContributionAlertCollapsed] =
    useState(false)
  const [isOverdueAlertVisible, setIsOverdueAlertVisible] = useState(true)
  const [isOverdueAlertCollapsed, setIsOverdueAlertCollapsed] = useState(false)
  const [isPenaltyAlertVisible, setIsPenaltyAlertVisible] = useState(true)
  const [isPenaltyAlertCollapsed, setIsPenaltyAlertCollapsed] = useState(false)
  const [isIkiminaAlertVisible, setIsIkiminaAlertVisible] = useState(true)
  const [isIkiminaAlertCollapsed, setIsIkiminaAlertCollapsed] = useState(false)
  const { data, isLoading, error, refetch } = useMemberDashboard()
  const { profile } = useProfile()

  const contributionAlertId = data?.data
    ? getContributionAlertState({
        isWindowOpen: data.data.window.isOpen,
        daysRemaining: data.data.window.daysRemaining,
        daysUntilNext: data.data.window.daysUntilNext,
        thisPeriodStatus:
          data.data.contributions.monthly.find(
            (item) => item.period === data.data.window.period
          )?.status ?? null,
        thisPeriodAmount:
          data.data.contributions.monthly.find(
            (item) => item.period === data.data.window.period
          )?.amount ?? 0,
        monthlyTarget: siteConfig.platform.savings.monthlyContributionRwf,
        penaltyRate: siteConfig.platform.savings.latePenaltyRate,
      }).id
    : null

  useEffect(() => {
    setMounted(true)
    setGreeting(getDynamicGreeting())
  }, [])

  useEffect(() => {
    if (!contributionAlertId) return
    setIsContributionAlertVisible(true)
    setIsContributionAlertCollapsed(false)
  }, [contributionAlertId])

  useEffect(() => {
    if (!data?.data.stats.loans.isOverdue) return
    setIsOverdueAlertVisible(true)
    setIsOverdueAlertCollapsed(false)
  }, [data?.data.stats.loans.isOverdue])

  useEffect(() => {
    if (!data?.data.stats.penalties.activeCount) return
    setIsPenaltyAlertVisible(true)
    setIsPenaltyAlertCollapsed(false)
  }, [data?.data.stats.penalties.activeCount])

  if (!mounted) return <MemberDashboardSkeleton />

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load your dashboard data. Please try again.
          <button
            onClick={() => refetch()}
            className="ml-2 underline hover:no-underline">
            Retry
          </button>
        </AlertDescription>
      </Alert>
    )
  }

  if (isLoading || !data) return <MemberDashboardSkeleton />

  const {
    member,
    stats,
    window: contributionWindow,
    contributions,
    loans,
    meetings,
    announcements,
    penalties,
  } = data.data

  const ikimina = profile?.metadata?.ikiminaProfile
  const hasPayoutDetails =
    !!ikimina?.preferredPayoutMethod &&
    (ikimina.preferredPayoutMethod === "cash" ||
      (ikimina.preferredPayoutMethod === "bank" &&
        !!ikimina.bankAccountNumber) ||
      (ikimina.preferredPayoutMethod === "mobile_money" &&
        !!ikimina.mobileMoneyNumber))

  const firstName = member.name?.trim().split(/\s+/)[0] ?? member.email
  const monthlyTarget = siteConfig.platform.savings.monthlyContributionRwf
  const latePenaltyRate = siteConfig.platform.savings.latePenaltyRate
  const hostFee = siteConfig.platform.meetings.hostContributionRwf
  const interestRate = Math.round(siteConfig.platform.loans.interestRate * 100)
  const maxRatio = siteConfig.platform.loans.maxLoanToSavingsRatio
  const loanCap = stats.savings.totalSaved * maxRatio

  const maxMonthlyAmount = Math.max(
    ...contributions.monthly.map((m) => m.amount),
    monthlyTarget
  )

  const currentContribution = contributions.monthly.find(
    (item) => item.period === contributionWindow.period
  )

  const contributionAlert = getContributionAlertState({
    isWindowOpen: contributionWindow.isOpen,
    daysRemaining: contributionWindow.daysRemaining,
    daysUntilNext: contributionWindow.daysUntilNext,
    thisPeriodStatus: currentContribution?.status ?? null,
    thisPeriodAmount: currentContribution?.amount ?? 0,
    monthlyTarget,
    penaltyRate: latePenaltyRate,
  })

  return (
    <Tabs defaultValue="overview" className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {greeting}, {firstName}!
          </h2>
          <p className="text-muted-foreground">
            Here&apos;s your Contribution snapshot for Posso Ventures.
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
            {contributionWindow.isOpen
              ? `${contributionWindow.daysRemaining}d remaining`
              : `Opens in ${contributionWindow.daysUntilNext}d`}
          </Badge>
        </div>
      </div>

      {isContributionAlertVisible && (
        <Alert variant={contributionAlert.variant}>
          {contributionAlert.variant === "destructive" ? (
            <AlertTriangle className="h-4 w-4" />
          ) : contributionAlert.variant === "warning" ? (
            <Clock className="h-4 w-4" />
          ) : contributionAlert.variant === "info" ? (
            <Bell className="h-4 w-4" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}

          <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-tight">
                {contributionAlert.title}
              </p>
              {!isContributionAlertCollapsed && (
                <AlertDescription className="mt-1">
                  {contributionAlert.message}{" "}
                  <Link
                    href="/member/contributions/history"
                    className="underline">
                    Open contributions
                  </Link>
                </AlertDescription>
              )}
            </div>

            <div className="flex items-center gap-1 self-start">
              <button
                type="button"
                onClick={() =>
                  setIsContributionAlertCollapsed((current) => !current)
                }
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground"
                aria-label={
                  isContributionAlertCollapsed
                    ? "Expand contribution alert"
                    : "Collapse contribution alert"
                }>
                {isContributionAlertCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsContributionAlertVisible(false)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground"
                aria-label="Close contribution alert">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Alert>
      )}

      {/* Overdue / penalty alerts */}
      {stats.loans.isOverdue && isOverdueAlertVisible && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-tight">
                You have an overdue loan
              </p>
              {!isOverdueAlertCollapsed && (
                <AlertDescription className="mt-1">
                  Please contact the committee or{" "}
                  <Link href="/member/loans" className="underline">
                    view your loans
                  </Link>{" "}
                  to resolve it.
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
                    ? "Expand overdue alert"
                    : "Collapse overdue alert"
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
                aria-label="Close overdue alert">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Alert>
      )}

      {stats.penalties.activeCount > 0 && isPenaltyAlertVisible && (
        <Alert variant="warning">
          <AlertCircle className="h-4 w-4" />
          <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-tight">
                You have {stats.penalties.activeCount} active{" "}
                {stats.penalties.activeCount === 1 ? "penalty" : "penalties"}
              </p>
              {!isPenaltyAlertCollapsed && (
                <AlertDescription className="mt-1">
                  Current outstanding amount is{" "}
                  {formatRwf(stats.penalties.totalAmount)}.{" "}
                  <Link href="/member/penalties" className="underline">
                    View details
                  </Link>
                </AlertDescription>
              )}
            </div>
            <div className="flex items-center gap-1 self-start">
              <button
                type="button"
                onClick={() =>
                  setIsPenaltyAlertCollapsed((current) => !current)
                }
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground"
                aria-label={
                  isPenaltyAlertCollapsed
                    ? "Expand penalty alert"
                    : "Collapse penalty alert"
                }>
                {isPenaltyAlertCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsPenaltyAlertVisible(false)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground"
                aria-label="Close penalty alert">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Alert>
      )}

      {!hasPayoutDetails && isIkiminaAlertVisible && (
        <Alert variant="warning">
          <HandCoins className="h-4 w-4" />
          <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-tight">
                Payout details not set up
              </p>
              {!isIkiminaAlertCollapsed && (
                <AlertDescription className="mt-1">
                  The committee needs your payout information to disburse loans
                  and matching records. Please{" "}
                  <Link
                    href="/member/profile?tab=ikimina"
                    className="font-medium underline underline-offset-2">
                    update your payout details
                  </Link>{" "}
                  as soon as possible.
                </AlertDescription>
              )}
            </div>
            <div className="flex items-center gap-1 self-start">
              <button
                type="button"
                onClick={() =>
                  setIsIkiminaAlertCollapsed((current) => !current)
                }
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground"
                aria-label={
                  isIkiminaAlertCollapsed
                    ? "Expand payout alert"
                    : "Collapse payout alert"
                }>
                {isIkiminaAlertCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsIkiminaAlertVisible(false)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground"
                aria-label="Dismiss payout alert">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Alert>
      )}

      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="savings">Savings</TabsTrigger>
        <TabsTrigger value="loans">Loans</TabsTrigger>
        <TabsTrigger value="meetings">Meetings</TabsTrigger>
      </TabsList>

      {/* ─── OVERVIEW TAB ─── */}
      <TabsContent value="overview" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total savings"
            value={formatRwf(stats.savings.totalSaved)}
            icon={Wallet}
            iconColor="text-emerald-500"
            description={`${stats.savings.confirmedCount} confirmed payments`}
          />
          <StatCard
            title="This period"
            value={
              stats.savings.thisPeriodStatus
                ? formatRwf(stats.savings.thisPeriodAmount)
                : "Not recorded"
            }
            icon={HandCoins}
            iconColor="text-cyan-500"
            description={
              stats.savings.thisPeriodStatus
                ? `Status: ${stats.savings.thisPeriodStatus}`
                : `Target: ${formatRwf(monthlyTarget)}`
            }
          />
          <StatCard
            title={
              stats.loans.activeLoan
                ? "Active loan"
                : stats.loans.pendingRequests > 0
                  ? "Loan pending"
                  : "No active loan"
            }
            value={
              stats.loans.activeLoan
                ? formatRwf(stats.loans.activeLoan.amount)
                : stats.loans.pendingRequests > 0
                  ? `${stats.loans.pendingRequests} awaiting review`
                  : "Eligible for loan"
            }
            icon={Landmark}
            iconColor={
              stats.loans.isOverdue
                ? "text-red-500"
                : stats.loans.activeLoan
                  ? "text-indigo-500"
                  : "text-slate-400"
            }
            description={
              stats.loans.activeLoan
                ? `${stats.loans.activeLoan.status} · ${interestRate}% interest`
                : `Cap: ${formatRwf(loanCap)}`
            }
          />
          <StatCard
            title="Next meeting"
            value={
              meetings.upcoming[0]
                ? new Date(meetings.upcoming[0].scheduledAt).toLocaleDateString(
                    undefined,
                    { month: "short", day: "numeric" }
                  )
                : "TBD"
            }
            icon={CalendarDays}
            iconColor="text-amber-500"
            description={
              meetings.upcoming[0]?.title || `Host fee: ${formatRwf(hostFee)}`
            }
          />
        </div>

        {/* Contribution momentum + loan pipeline */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2 border-emerald-200/60 bg-linear-to-br from-emerald-50 via-white to-slate-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                Contribution momentum
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {contributions.monthly.map((item) => (
                <div key={item.period} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-8">
                        {item.month}
                      </span>
                      {item.status && <StatusBadge status={item.status} />}
                    </div>
                    <span className="font-semibold tabular-nums">
                      {item.amount > 0 ? formatRwf(item.amount) : "-"}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-emerald-100">
                    <div
                      className={`h-2.5 rounded-full transition-all ${
                        item.status === "confirmed"
                          ? "bg-emerald-500"
                          : item.status === "late"
                            ? "bg-red-400"
                            : item.status === "pending"
                              ? "bg-amber-400"
                              : "bg-slate-300"
                      }`}
                      style={{
                        width: `${Math.min((item.amount / maxMonthlyAmount) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Zap className="h-3 w-3 text-emerald-500" />
                {stats.savings.streak > 0
                  ? `${stats.savings.streak}-month confirmed streak`
                  : "No active streak - pay this period to start one"}
              </div>
            </CardContent>
          </Card>

          {/* Attendance + ikimina rules */}
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  My attendance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tabular-nums">
                    {stats.attendance.rate}%
                  </span>
                  <span className="text-sm text-muted-foreground">overall</span>
                </div>
                <Progress value={stats.attendance.rate} className="h-2" />
                <div className="grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
                  <div>
                    <div className="font-semibold text-emerald-600 text-base">
                      {stats.attendance.present}
                    </div>
                    Present
                  </div>
                  <div>
                    <div className="font-semibold text-red-500 text-base">
                      {stats.attendance.absent}
                    </div>
                    Absent
                  </div>
                  <div>
                    <div className="font-semibold text-amber-500 text-base">
                      {stats.attendance.excused}
                    </div>
                    Excused
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  Ikimina rules
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  {
                    label: "Monthly contribution",
                    value: formatRwf(monthlyTarget),
                    icon: HandCoins,
                  },
                  {
                    label: "Loan cap",
                    value: `${maxRatio}x your savings`,
                    icon: Landmark,
                  },
                  {
                    label: "Interest rate",
                    value: `${interestRate}% p.a.`,
                    icon: Banknote,
                  },
                  {
                    label: "Host fee",
                    value: formatRwf(hostFee),
                    icon: Users,
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
          </div>
        </div>

        {/* Announcements + next meeting */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                Latest announcements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {announcements.recent.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No announcements yet.
                </p>
              ) : (
                announcements.recent.map((item) => (
                  <div key={item.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-tight">
                        {item.title}
                      </p>
                      {item.pinned && (
                        <Badge variant="secondary" className="shrink-0">
                          Pinned
                        </Badge>
                      )}
                    </div>
                    {item.summary && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {item.summary}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(item.publishedAt)}
                    </p>
                  </div>
                ))
              )}
              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link href="/member/announcements">View all</Link>
              </Button>
            </CardContent>
          </Card>

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
                  No meetings scheduled yet.
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
              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link href="/member/meetings">View all</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick nav cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/member/contributions" className="group">
            <Card className="transition-colors group-hover:border-primary/60">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  Contributions
                </CardTitle>
                <HandCoins className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  View your full savings history
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/member/loans" className="group">
            <Card className="transition-colors group-hover:border-primary/60">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">Loans</CardTitle>
                <Landmark className="h-4 w-4 text-slate-500" />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Request or track your loans
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/member/attendance" className="group">
            <Card className="transition-colors group-hover:border-primary/60">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  Attendance
                </CardTitle>
                <CalendarDays className="h-4 w-4 text-sky-500" />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Check your meeting participation
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </TabsContent>

      {/* ─── SAVINGS TAB ─── */}
      <TabsContent value="savings" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total confirmed"
            value={formatRwf(stats.savings.totalSaved)}
            icon={Wallet}
            iconColor="text-emerald-500"
            description={`${stats.savings.confirmedCount} payments`}
          />
          <StatCard
            title="This period"
            value={
              stats.savings.thisPeriodAmount > 0
                ? formatRwf(stats.savings.thisPeriodAmount)
                : "Not paid"
            }
            icon={Clock}
            iconColor="text-amber-500"
            description={contributionWindow.label}
          />
          <StatCard
            title="Late payments"
            value={stats.savings.lateCount}
            icon={AlertCircle}
            iconColor={
              stats.savings.lateCount > 0 ? "text-red-500" : "text-slate-400"
            }
            description={`${stats.savings.waivedCount} waived`}
          />
          <StatCard
            title="Payment streak"
            value={`${stats.savings.streak} ${stats.savings.streak === 1 ? "month" : "months"}`}
            icon={Zap}
            iconColor="text-emerald-500"
            description="Consecutive confirmed payments"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Monthly history</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {contributions.monthly.map((item) => (
                <div key={item.period} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-8 text-muted-foreground">
                        {item.month}
                      </span>
                      {item.status ? (
                        <StatusBadge status={item.status} />
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No record
                        </span>
                      )}
                    </div>
                    <span className="font-semibold tabular-nums">
                      {item.amount > 0 ? formatRwf(item.amount) : "-"}
                    </span>
                  </div>
                  <Progress
                    value={Math.min(
                      (item.amount / maxMonthlyAmount) * 100,
                      100
                    )}
                    className="h-2"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent contributions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {contributions.recent.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No contributions recorded yet.
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
                        {c.paidAt ? formatDate(c.paidAt) : "Pending"}
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
                <Link href="/member/contributions">View all</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Active penalties */}
        {penalties.active.length > 0 && (
          <Card className="border-red-200/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-4 w-4" />
                Active penalties
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {penalties.active.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3">
                  <div>
                    <p className="text-sm font-medium">
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
                <Link href="/member/penalties">View all penalties</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* ─── LOANS TAB ─── */}
      <TabsContent value="loans" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Loan eligibility"
            value={formatRwf(loanCap)}
            icon={Landmark}
            iconColor="text-indigo-500"
            description={`${maxRatio}x your confirmed savings`}
          />
          <StatCard
            title="Total loan requests"
            value={stats.loans.total}
            icon={CheckCircle2}
            iconColor="text-slate-500"
            description={`${stats.loans.pendingRequests} pending review`}
          />
          <StatCard
            title="Active loan"
            value={
              stats.loans.activeLoan
                ? formatRwf(stats.loans.activeLoan.amount)
                : "None"
            }
            icon={Banknote}
            iconColor={
              stats.loans.isOverdue
                ? "text-red-500"
                : stats.loans.activeLoan
                  ? "text-indigo-500"
                  : "text-slate-400"
            }
            description={
              stats.loans.activeLoan
                ? `${stats.loans.activeLoan.status} · due ${formatDate(stats.loans.activeLoan.dueDate)}`
                : "No active loan"
            }
          />
        </div>

        {stats.loans.activeLoan && (
          <Card
            className={
              stats.loans.isOverdue
                ? "border-red-300 bg-red-50/50"
                : "border-indigo-200/60 bg-indigo-50/30"
            }>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Landmark
                  className={`h-4 w-4 ${stats.loans.isOverdue ? "text-red-500" : "text-indigo-500"}`}
                />
                Active loan details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border bg-background p-3">
                <p className="text-xs uppercase text-muted-foreground">
                  Amount
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums">
                  {formatRwf(stats.loans.activeLoan.amount)}
                </p>
              </div>
              <div className="rounded-lg border bg-background p-3">
                <p className="text-xs uppercase text-muted-foreground">
                  Status
                </p>
                <div className="mt-1">
                  <StatusBadge status={stats.loans.activeLoan.status} />
                </div>
              </div>
              <div className="rounded-lg border bg-background p-3">
                <p className="text-xs uppercase text-muted-foreground">
                  Due date
                </p>
                <p className="mt-1 text-sm font-medium">
                  {formatDate(stats.loans.activeLoan.dueDate)}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Loan history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loans.recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No loan requests yet.
              </p>
            ) : (
              loans.recent.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">
                      {formatRwf(l.approvedAmount ?? l.requestedAmount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Requested {formatDate(l.requestedAt)}
                      {l.termMonths && ` · ${l.termMonths} months`}
                    </p>
                  </div>
                  <StatusBadge status={l.status} />
                </div>
              ))
            )}
            <Button asChild variant="ghost" size="sm" className="w-full">
              <Link href="/member/loans">View all & request loan</Link>
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ─── MEETINGS TAB ─── */}
      <TabsContent value="meetings" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Attendance rate"
            value={`${stats.attendance.rate}%`}
            icon={CheckCircle2}
            iconColor="text-emerald-500"
            description={`${stats.attendance.present} of ${stats.attendance.total} meetings`}
          />
          <StatCard
            title="Absences"
            value={stats.attendance.absent}
            icon={AlertCircle}
            iconColor={
              stats.attendance.absent > 0 ? "text-red-500" : "text-slate-400"
            }
            description={`${stats.attendance.excused} excused`}
          />
          <StatCard
            title="Host fee"
            value={formatRwf(hostFee)}
            icon={CalendarDays}
            iconColor="text-amber-500"
            description="Per meeting hosted"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming meetings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {meetings.upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No meetings scheduled yet.
                </p>
              ) : (
                meetings.upcoming.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-lg border bg-background p-4">
                    <p className="font-semibold">{m.title}</p>
                    <p className="text-sm text-muted-foreground">
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
              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link href="/member/meetings">View all meetings</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent attendance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {meetings.recentAttendance.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No attendance records yet.
                </p>
              ) : (
                meetings.recentAttendance.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">
                      {a.checkedInAt
                        ? formatDateTime(a.checkedInAt)
                        : formatDate(a.createdAt)}
                    </p>
                    <StatusBadge status={a.status} />
                  </div>
                ))
              )}
              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link href="/member/attendance">Full attendance record</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  )
}

function MemberDashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
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
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-2.5 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
