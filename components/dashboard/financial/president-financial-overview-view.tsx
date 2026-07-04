"use client"

import { useMemo, useState } from "react"
import { siteConfig } from "@/constants/site-config"
import { addMonths, format, isSameMonth, parse, subMonths } from "date-fns"
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  RefreshCcw,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts"

import { getActivePeriod } from "@/lib/contribution-window"
import { useContributions } from "@/hooks/api/use-contributions"
import { useAdminLoans } from "@/hooks/api/use-loans"
import { usePenalties } from "@/hooks/api/use-penalties"
import { useTreasurerDashboard } from "@/hooks/api/use-treasurer-dashboard"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
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

const { monthlyContributionRwf, latePenaltyRate, contributionWindow } =
  siteConfig.platform.savings
const { membershipCount } = siteConfig.platform.governance
const { interestRate } = siteConfig.platform.loans

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatRwf(amount?: string | number | null) {
  if (amount === undefined || amount === null) return "-"
  const value = typeof amount === "number" ? amount : Number.parseFloat(amount)
  if (Number.isNaN(value)) return "-"
  return `${new Intl.NumberFormat("en-RW").format(value)}\u00A0RWF`
}

function formatRwfCompact(value: number) {
  return new Intl.NumberFormat("en-RW", { notation: "compact" }).format(value)
}

function periodLabel(period: string) {
  try {
    return format(parse(period, "yyyy-MM", new Date()), "MMMM yyyy")
  } catch {
    return period
  }
}

function periodShortLabel(period: string) {
  try {
    return format(parse(period, "yyyy-MM", new Date()), "MMM yy")
  } catch {
    return period
  }
}

function inMonth(date: string | Date | null | undefined, monthDate: Date) {
  if (!date) return false
  const d = date instanceof Date ? date : new Date(date)
  return isSameMonth(d, monthDate)
}

function loanStatusVariant(
  status?: string
): "success" | "warning" | "danger" | "secondary" | "outline" | "info" {
  switch (status) {
    case "repaid":
      return "success"
    case "requested":
      return "warning"
    case "overdue":
      return "danger"
    case "approved":
    case "disbursed":
      return "info"
    case "repaying":
      return "secondary"
    default:
      return "outline"
  }
}

// ─── Chart configs ─────────────────────────────────────────────────────────

const trendChartConfig = {
  collected: {
    label: "Collected",
    theme: { light: "#0ea5e9", dark: "#38bdf8" },
  },
  confirmed: {
    label: "Confirmed",
    theme: { light: "#10b981", dark: "#34d399" },
  },
} satisfies ChartConfig

const loanChartConfig = {
  requested: { label: "Requested", color: "#f59e0b" },
  disbursed: { label: "Disbursed", color: "#6366f1" },
} satisfies ChartConfig

// ─── Sub-components ───────────────────────────────────────────────────────

function CollectionProgressBar({
  confirmed,
  collected,
  expected,
}: {
  confirmed: number
  collected: number
  expected: number
}) {
  const confirmedPct =
    expected > 0 ? Math.min(100, (confirmed / expected) * 100) : 0
  const pendingPct =
    expected > 0
      ? Math.min(100 - confirmedPct, ((collected - confirmed) / expected) * 100)
      : 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Collection progress</span>
        <span className="tabular-nums font-medium">
          {confirmedPct.toFixed(0)}% confirmed
        </span>
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="absolute inset-y-0 left-0 rounded-l-full bg-emerald-500 transition-all"
          style={{ width: `${confirmedPct}%` }}
        />
        <div
          className="absolute inset-y-0 bg-amber-400/80 transition-all"
          style={{ left: `${confirmedPct}%`, width: `${pendingPct}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          Confirmed {formatRwf(confirmed)}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-400/80" />
          Pending {formatRwf(Math.max(0, collected - confirmed))}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/30" />
          Target {formatRwf(expected)}
        </span>
      </div>
    </div>
  )
}

function CollectionTrendChart({
  data,
}: {
  data: { label: string; collected: number; confirmed: number }[]
}) {
  if (data.length === 0) return null
  const target = membershipCount * monthlyContributionRwf

  return (
    <ChartContainer config={trendChartConfig} className="h-56 w-full">
      <ComposedChart
        data={data}
        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10 }}
          tickMargin={8}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fontSize: 10 }}
          tickFormatter={formatRwfCompact}
        />
        <ChartTooltip
          cursor={false}
          content={(props) => (
            <ChartTooltipContent
              {...props}
              formatter={(value, name) =>
                `${String(name)}: ${formatRwf(
                  typeof value === "number" ? value : Number(value)
                )}`
              }
              labelFormatter={(label) => String(label)}
            />
          )}
        />
        <ReferenceLine
          y={target}
          stroke="#6366f1"
          strokeDasharray="4 4"
          strokeWidth={1.5}
          label={{
            value: "Target",
            position: "insideTopRight",
            fontSize: 10,
            fill: "#6366f1",
          }}
        />
        <Bar
          dataKey="collected"
          fill="var(--color-collected)"
          fillOpacity={0.65}
          radius={[3, 3, 0, 0]}
        />
        <Line
          dataKey="confirmed"
          type="monotone"
          stroke="var(--color-confirmed)"
          strokeWidth={2}
          dot={{ r: 3, fill: "var(--color-confirmed)", strokeWidth: 0 }}
          activeDot={{ r: 4 }}
        />
      </ComposedChart>
    </ChartContainer>
  )
}

function LoanTrendChart({
  data,
}: {
  data: { label: string; requested: number; disbursed: number }[]
}) {
  if (data.length === 0) return null

  return (
    <ChartContainer config={loanChartConfig} className="h-48 w-full">
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10 }}
          tickMargin={8}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fontSize: 10 }}
          tickFormatter={(v: number) => String(v)}
        />
        <ChartTooltip
          cursor={false}
          content={(props) => (
            <ChartTooltipContent
              {...props}
              formatter={(value, name) => `${String(name)}: ${String(value)}`}
              labelFormatter={(label) => String(label)}
            />
          )}
        />
        <Bar
          dataKey="requested"
          fill={loanChartConfig.requested.color}
          fillOpacity={0.65}
          radius={[3, 3, 0, 0]}
        />
        <Bar
          dataKey="disbursed"
          fill={loanChartConfig.disbursed.color}
          fillOpacity={0.8}
          radius={[3, 3, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  )
}

// ─── Main view ─────────────────────────────────────────────────────────────

export function PresidentFinancialOverviewView() {
  const today = new Date()
  const activePeriod = useMemo(() => getActivePeriod(), [])
  const [selectedPeriod, setSelectedPeriod] = useState(activePeriod)

  const periodDate = useMemo(
    () => parse(selectedPeriod, "yyyy-MM", new Date()),
    [selectedPeriod]
  )

  const isCurrentPeriod = selectedPeriod === activePeriod

  // Dashboard aggregate stats
  const {
    data: dashboardData,
    isPending: dashboardPending,
    isRefetching: dashboardRefetching,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useTreasurerDashboard()

  // Monthly contributions for selected period
  const {
    data: contribData,
    isPending: contribPending,
    isRefetching: contribRefetching,
    error: contribError,
    refetch: refetchContribs,
  } = useContributions({ period: selectedPeriod, limit: 200 })

  // All contributions for trend
  const { data: allContribData } = useContributions({ limit: 600 })

  // Loans
  const {
    loans: allLoans,
    isPending: loansPending,
    isRefetching: loansRefetching,
    error: loansError,
    refetch: refetchLoans,
  } = useAdminLoans()

  // Penalties
  const {
    data: penaltiesData,
    isPending: penaltiesPending,
    isRefetching: penaltiesRefetching,
    error: penaltiesError,
    refetch: refetchPenalties,
  } = usePenalties({ status: "active", limit: 200 })

  const contributions = useMemo(() => contribData?.data ?? [], [contribData])
  const allContributions = useMemo(
    () => allContribData?.data ?? [],
    [allContribData]
  )
  const penalties = useMemo(() => penaltiesData?.data ?? [], [penaltiesData])

  const stats = dashboardData?.data?.stats

  // ── Period contributions summary ────────────────────────────────────────

  const contribSummary = useMemo(() => {
    let collected = 0
    let confirmed = 0
    let pendingCount = 0
    let lateCount = 0
    let waivedCount = 0

    for (const c of contributions) {
      const amount = Number.parseFloat(c.amount || "0")
      const safe = Number.isNaN(amount) ? 0 : amount
      collected += safe
      if (c.status === "confirmed") confirmed += safe
      if (c.status === "pending") pendingCount++
      if (c.status === "late") lateCount++
      if (c.status === "waived") waivedCount++
    }

    const confirmedCount = contributions.filter(
      (c) => c.status === "confirmed"
    ).length
    const expected = membershipCount * monthlyContributionRwf
    const compliance =
      membershipCount > 0
        ? Math.round((confirmedCount / membershipCount) * 100)
        : 0

    return {
      collected,
      confirmed,
      pendingCount,
      lateCount,
      waivedCount,
      confirmedCount,
      expected,
      compliance,
    }
  }, [contributions])

  // ── Active / overdue loans ──────────────────────────────────────────────

  const activeLoans = useMemo(
    () =>
      allLoans.filter((l) =>
        ["approved", "disbursed", "repaying"].includes(l.status ?? "")
      ),
    [allLoans]
  )

  const overdueLoans = useMemo(
    () => allLoans.filter((l) => l.status === "overdue"),
    [allLoans]
  )

  const activeLoansTotal = useMemo(
    () =>
      activeLoans.reduce((sum, l) => {
        const v = Number.parseFloat(
          l.approvedAmount || l.requestedAmount || "0"
        )
        return sum + (Number.isNaN(v) ? 0 : v)
      }, 0),
    [activeLoans]
  )

  // ── Penalty summary ─────────────────────────────────────────────────────

  const penaltyTotal = useMemo(
    () =>
      penalties.reduce((sum, p) => {
        const v = Number.parseFloat(String(p.amount || "0"))
        return sum + (Number.isNaN(v) ? 0 : v)
      }, 0),
    [penalties]
  )

  // ── 6-month trend ───────────────────────────────────────────────────────

  const trendData = useMemo(() => {
    const periods: string[] = []
    for (let i = 5; i >= 0; i--) {
      periods.push(format(subMonths(periodDate, i), "yyyy-MM"))
    }
    return periods.map((p) => {
      const pc = allContributions.filter((c) => c.period === p)
      const collected = pc.reduce((sum, c) => {
        const v = Number.parseFloat(c.amount || "0")
        return sum + (Number.isNaN(v) ? 0 : v)
      }, 0)
      const confirmed = pc
        .filter((c) => c.status === "confirmed")
        .reduce((sum, c) => {
          const v = Number.parseFloat(c.amount || "0")
          return sum + (Number.isNaN(v) ? 0 : v)
        }, 0)
      return { period: p, label: periodShortLabel(p), collected, confirmed }
    })
  }, [allContributions, periodDate])

  // ── Loan monthly trend (from dashboard) ────────────────────────────────

  const loanTrendData = useMemo(() => {
    const monthly = dashboardData?.data?.loans?.monthly ?? []
    return monthly.slice(-6).map((m) => ({
      label: m.month,
      requested: m.requested,
      disbursed: m.disbursed,
    }))
  }, [dashboardData])

  // ── Insights ────────────────────────────────────────────────────────────

  const insights = useMemo(() => {
    const list: string[] = []
    const noRecord = membershipCount - contributions.length
    if (noRecord > 0)
      list.push(
        `${noRecord} member${noRecord > 1 ? "s" : ""} have no contribution record yet.`
      )
    if (contribSummary.lateCount > 0)
      list.push(
        `${contribSummary.lateCount} late payment${contribSummary.lateCount > 1 ? "s" : ""} this period.`
      )
    if (contribSummary.compliance === 100)
      list.push("All members have confirmed contributions this period.")
    if (overdueLoans.length > 0)
      list.push(
        `${overdueLoans.length} loan${overdueLoans.length > 1 ? "s" : ""} currently overdue.`
      )
    if (activeLoans.length > 0)
      list.push(
        `${activeLoans.length} active loan${activeLoans.length > 1 ? "s" : ""} totalling ${formatRwf(activeLoansTotal)}.`
      )
    return list.slice(0, 4)
  }, [
    contribSummary,
    overdueLoans,
    activeLoans,
    activeLoansTotal,
    contributions.length,
  ])

  const isRefetching =
    dashboardRefetching ||
    contribRefetching ||
    loansRefetching ||
    penaltiesRefetching
  const isInitialLoading =
    (dashboardPending && !stats) ||
    (contribPending && contributions.length === 0)
  const errors = [
    dashboardError,
    contribError,
    loansError,
    penaltiesError,
  ].filter(Boolean)

  async function handleRefresh() {
    await Promise.all([
      refetchDashboard(),
      refetchContribs(),
      refetchLoans(),
      refetchPenalties(),
    ])
  }

  function navigatePeriod(dir: -1 | 1) {
    const next = dir === 1 ? addMonths(periodDate, 1) : subMonths(periodDate, 1)
    setSelectedPeriod(format(next, "yyyy-MM"))
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Financial Overview</h1>
          <p className="text-sm text-muted-foreground">
            Read-only summary of group savings, loans, and penalties. Detailed
            management is handled by the Treasurer.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void handleRefresh()}
          disabled={isRefetching}>
          <RefreshCcw className="h-4 w-4" />
          {isRefetching ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            {errors[0]?.help ||
              errors[0]?.message ||
              "Unable to load financial data."}
          </AlertDescription>
        </Alert>
      )}

      {/* ── Aggregate KPI Cards ───────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-base font-semibold">Group Snapshot</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                All-Time Savings Collected
              </CardTitle>
              <Wallet className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              {isInitialLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className="text-2xl font-semibold tabular-nums">
                    {formatRwf(stats?.contributions.totalAllTimeAmount)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.contributions.confirmedCount ?? 0} confirmed
                    contributions
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Active Loans
              </CardTitle>
              <CreditCard className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              {loansPending ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className="text-2xl font-semibold tabular-nums">
                    {formatRwf(activeLoansTotal)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {activeLoans.length} loan
                    {activeLoans.length !== 1 ? "s" : ""} outstanding
                    {overdueLoans.length > 0 && (
                      <span className="ml-1 text-rose-500">
                        · {overdueLoans.length} overdue
                      </span>
                    )}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Active Penalties
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              {penaltiesPending ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className="text-2xl font-semibold tabular-nums">
                    {formatRwf(penaltyTotal)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {penalties.length} active{" "}
                    {penalties.length !== 1 ? "penalties" : "penalty"}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Member Compliance
              </CardTitle>
              <Users className="h-4 w-4 text-violet-500" />
            </CardHeader>
            <CardContent>
              {isInitialLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-semibold">
                    {contribSummary.compliance}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {contribSummary.confirmedCount}/{membershipCount} members
                    confirmed - {periodLabel(selectedPeriod)}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Period Navigator ──────────────────────────────────────────────── */}
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
              <div className="min-w-[170px] text-center">
                <p className="text-lg font-semibold">
                  {periodLabel(selectedPeriod)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Window: {contributionWindow.startDay}th –{" "}
                  {contributionWindow.endDay}th
                </p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigatePeriod(1)}
                disabled={isCurrentPeriod}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {isCurrentPeriod && <Badge variant="info">Current month</Badge>}
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

      {/* ── Period Contribution KPIs ──────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-base font-semibold">
          Contributions - {periodLabel(selectedPeriod)}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Collected</CardTitle>
              <Wallet className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              {contribPending ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className="text-2xl font-semibold tabular-nums">
                    {formatRwf(contribSummary.collected)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    of {formatRwf(contribSummary.expected)} expected
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
              {contribPending ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className="text-2xl font-semibold tabular-nums">
                    {formatRwf(contribSummary.confirmed)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {contribSummary.compliance}% member compliance
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
              {contribPending ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-semibold">
                    {contribSummary.pendingCount + contribSummary.lateCount}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {contribSummary.pendingCount} pending ·{" "}
                    {contribSummary.lateCount} late
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Interest Rate
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                {(interestRate * 100).toFixed(0)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Flat rate on all loans
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Visual Overview ───────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold">Visual Overview</h2>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Collection progress */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Collection Progress - {periodLabel(selectedPeriod)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {contribPending ? (
                <Skeleton className="h-12 w-full" />
              ) : (
                <CollectionProgressBar
                  confirmed={contribSummary.confirmed}
                  collected={contribSummary.collected}
                  expected={contribSummary.expected}
                />
              )}
            </CardContent>
          </Card>

          {/* Highlights */}
          {insights.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
                  <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                  Highlights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5">
                  {insights.map((insight, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                      {insight}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 6-month contribution trend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              6-Month Contribution Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isInitialLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <CollectionTrendChart data={trendData} />
            )}
          </CardContent>
        </Card>

        {/* Loan monthly trend */}
        {loanTrendData.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Loan Activity - Last 6 Months
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardPending ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <LoanTrendChart data={loanTrendData} />
              )}
            </CardContent>
          </Card>
        )}
      </section>

      {/* ── Active Loans Table ────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-base font-semibold">Active Loans</h2>
        <Card>
          <CardContent className="p-0">
            {loansPending ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : activeLoans.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                No active loans at this time.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeLoans.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell className="font-medium">
                        {loan.memberName ?? "-"}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatRwf(loan.approvedAmount || loan.requestedAmount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {loan.termMonths ? `${loan.termMonths}mo` : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={loanStatusVariant(loan.status ?? "")}>
                          {loan.status ?? "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {loan.requestedAt
                          ? format(new Date(loan.requestedAt), "MMM d, yyyy")
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── Overdue Loans ─────────────────────────────────────────────────── */}
      {overdueLoans.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-semibold text-rose-600">
            Overdue Loans
          </h2>
          <Card className="border-rose-200">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueLoans.map((loan) => (
                    <TableRow key={loan.id} className="bg-rose-50/40">
                      <TableCell className="font-medium">
                        {loan.memberName ?? "-"}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatRwf(loan.approvedAmount || loan.requestedAmount)}
                      </TableCell>
                      <TableCell className="text-rose-600">
                        {loan.dueDate
                          ? format(new Date(loan.dueDate), "MMM d, yyyy")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="danger">overdue</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      )}

      {/* ── Monthly Breakdown ─────────────────────────────────────────────── */}
      {dashboardData?.data?.contributions?.monthly &&
        dashboardData.data.contributions.monthly.length > 0 && (
          <section>
            <h2 className="mb-3 text-base font-semibold">
              Monthly Contribution Breakdown
            </h2>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Confirmed</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Late</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboardData.data.contributions.monthly
                      .slice(-6)
                      .reverse()
                      .map((m) => {
                        const rate =
                          m.total > 0
                            ? Math.round((m.confirmed / m.total) * 100)
                            : 0
                        return (
                          <TableRow key={m.period}>
                            <TableCell className="font-medium">
                              {m.month}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-emerald-600">
                              {m.confirmed}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {m.total}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-rose-500">
                              {m.late}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge
                                variant={
                                  rate === 100
                                    ? "success"
                                    : rate >= 80
                                      ? "warning"
                                      : "danger"
                                }>
                                {rate}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </section>
        )}

      {/* ── Financial Rules Reference ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Banknote className="h-4 w-4 text-muted-foreground" />
            Financial Rules - Constitution Reference
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Monthly contribution:</strong>{" "}
            {formatRwf(monthlyContributionRwf)} per member. Payment window:{" "}
            {contributionWindow.startDay}th → {contributionWindow.endDay}th of
            following month.
          </p>
          <Separator />
          <p>
            <strong className="text-foreground">Late penalty:</strong>{" "}
            {(latePenaltyRate * 100).toFixed(0)}% of the contribution amount.
            Penalties are added to the general fund.
          </p>
          <Separator />
          <p>
            <strong className="text-foreground">Loan cap:</strong> Up to the
            member&apos;s total accumulated personal savings. Flat interest rate
            of {(interestRate * 100).toFixed(0)}%.
          </p>
          <Separator />
          <p>
            <strong className="text-foreground">Dual authorization:</strong> All
            withdrawals or transfers require sign-off from both the President
            and Treasurer.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
