"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  CalendarClock,
  HandCoins,
  PiggyBank,
  RefreshCcw,
  TrendingUp,
} from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { useMyContributions } from "@/hooks/api/use-contributions"
import { useMyLoans } from "@/hooks/api/use-loans"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Loader } from "@/components/common/loader"

function formatRwf(amount?: string | number | null) {
  if (amount === null || amount === undefined) return "-"
  const value = typeof amount === "number" ? amount : Number.parseFloat(amount)
  if (Number.isNaN(value)) return "-"
  return `${new Intl.NumberFormat("en-RW").format(value)} RWF`
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

function contributionStatusVariant(status?: string) {
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

const outstandingLoanStatuses = new Set([
  "approved",
  "disbursed",
  "repaying",
  "overdue",
])

type TrendPoint = {
  period: string
  label: string
  total: number
  confirmed: number
}

type SavingsFilterValue =
  | "all"
  | "last-3"
  | "last-6"
  | "last-12"
  | `period:${string}`

function formatPeriodLabel(period: string) {
  const [year, month] = period.split("-")
  if (!year || !month) return period

  const date = new Date(Number(year), Number(month) - 1, 1)
  if (Number.isNaN(date.getTime())) return period

  return date.toLocaleDateString("en-RW", {
    month: "short",
    year: "numeric",
  })
}

const chartConfig = {
  total: {
    label: "Total",
    theme: {
      light: "#0ea5e9",
      dark: "#38bdf8",
    },
  },
  confirmed: {
    label: "Confirmed",
    theme: {
      light: "#10b981",
      dark: "#34d399",
    },
  },
} satisfies ChartConfig

const chartLegendItems = [
  { key: "total", label: "Total", color: "#0ea5e9" },
  { key: "confirmed", label: "Confirmed", color: "#10b981" },
] as const

function periodToMonthIndex(period: string) {
  const [year, month] = period.split("-")
  const y = Number(year)
  const m = Number(month)

  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) {
    return null
  }

  return y * 12 + (m - 1)
}

function getSelectedPeriodFromFilter(value: SavingsFilterValue) {
  return value.startsWith("period:") ? value.replace("period:", "") : null
}

export function UserSavingsView() {
  const {
    data: contributionsData,
    isPending: isContributionsPending,
    isRefetching: isContributionsRefetching,
    error: contributionsError,
    refetch: refetchContributions,
  } = useMyContributions(100)

  const {
    data: loansData,
    isPending: isLoansPending,
    isRefetching: isLoansRefetching,
    error: loansError,
    refetch: refetchLoans,
  } = useMyLoans(50)

  const contributions = useMemo(
    () => contributionsData?.data ?? [],
    [contributionsData?.data]
  )
  const loans = useMemo(() => loansData?.data ?? [], [loansData?.data])
  const [selectedFilter, setSelectedFilter] =
    useState<SavingsFilterValue>("all")

  const availablePeriods = useMemo(() => {
    return Array.from(
      new Set(
        contributions
          .map((item) => item.period)
          .filter((period): period is string => Boolean(period))
      )
    ).sort((a, b) => b.localeCompare(a))
  }, [contributions])

  const filteredContributions = useMemo(() => {
    const selectedPeriod = getSelectedPeriodFromFilter(selectedFilter)
    let scoped = contributions

    if (selectedPeriod) {
      scoped = contributions.filter((item) => item.period === selectedPeriod)
    } else if (
      selectedFilter === "last-3" ||
      selectedFilter === "last-6" ||
      selectedFilter === "last-12"
    ) {
      const months = Number(selectedFilter.replace("last-", ""))
      const monthIndexes = contributions
        .map((item) => periodToMonthIndex(item.period || ""))
        .filter((value): value is number => value !== null)

      const maxIndex =
        monthIndexes.length > 0 ? Math.max(...monthIndexes) : null

      if (maxIndex !== null) {
        const minIndex = maxIndex - (months - 1)
        scoped = contributions.filter((item) => {
          const index = periodToMonthIndex(item.period || "")
          return index !== null && index >= minIndex && index <= maxIndex
        })
      }
    }

    return [...scoped].sort((a, b) => {
      const aDate = new Date(a.createdAt || 0).getTime()
      const bDate = new Date(b.createdAt || 0).getTime()
      return bDate - aDate
    })
  }, [contributions, selectedFilter])

  const stats = useMemo(() => {
    let confirmed = 0
    let pending = 0
    let late = 0

    for (const contribution of filteredContributions) {
      const amount = Number.parseFloat(contribution.amount || "0")
      const safeAmount = Number.isNaN(amount) ? 0 : amount

      if (contribution.status === "confirmed") confirmed += safeAmount
      if (contribution.status === "pending") pending += safeAmount
      if (contribution.status === "late") late += safeAmount
    }

    let outstandingLoans = 0

    for (const loan of loans) {
      if (!outstandingLoanStatuses.has(loan.status || "")) continue
      const amount = Number.parseFloat(
        String(loan.approvedAmount || loan.requestedAmount || "0")
      )
      if (!Number.isNaN(amount)) outstandingLoans += amount
    }

    const healthRatio =
      confirmed > 0 ? ((confirmed - outstandingLoans) / confirmed) * 100 : 0

    return {
      confirmed,
      pending,
      late,
      outstandingLoans,
      healthRatio: Math.max(0, Math.min(healthRatio, 100)),
    }
  }, [filteredContributions, loans])

  const recentContributions = filteredContributions.slice(0, 8)
  const latestContribution = filteredContributions[0] ?? null

  const monthlyTrend = useMemo<TrendPoint[]>(() => {
    const grouped = new Map<string, { total: number; confirmed: number }>()

    for (const item of filteredContributions) {
      const period = item.period || "unknown"
      const amount = Number.parseFloat(item.amount || "0")
      const safeAmount = Number.isNaN(amount) ? 0 : amount

      const existing = grouped.get(period) ?? { total: 0, confirmed: 0 }
      existing.total += safeAmount

      if (item.status === "confirmed") {
        existing.confirmed += safeAmount
      }

      grouped.set(period, existing)
    }

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([period, values]) => ({
        period,
        label: formatPeriodLabel(period),
        total: values.total,
        confirmed: values.confirmed,
      }))
  }, [filteredContributions])

  const isRefreshing = isContributionsRefetching || isLoansRefetching

  const handleRefresh = async () => {
    await Promise.all([refetchContributions(), refetchLoans()])
  }

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">My Savings</h1>
          <p className="text-sm text-muted-foreground">
            Monitor confirmed savings, pending records, and active loan
            exposure.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void handleRefresh()}
          disabled={isRefreshing}>
          <RefreshCcw className="h-4 w-4" />
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {contributionsError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {contributionsError.help ||
              contributionsError.message ||
              "Unable to load your savings records."}
          </AlertDescription>
        </Alert>
      ) : null}

      {loansError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {loansError.help ||
              loansError.message ||
              "Unable to load your loan records."}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Confirmed Savings
            </CardTitle>
            <PiggyBank className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {formatRwf(stats.confirmed)}
            </div>
            <p className="text-xs text-muted-foreground">
              Ready for borrowing and balances.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Pending Savings
            </CardTitle>
            <CalendarClock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {formatRwf(stats.pending)}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting review and confirmation.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Active Loan Exposure
            </CardTitle>
            <HandCoins className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {formatRwf(stats.outstandingLoans)}
            </div>
            <p className="text-xs text-muted-foreground">
              Approved, disbursed, and repaying loans.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Savings Health
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {stats.healthRatio.toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Share of savings not tied to active loans.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold">
              Monthly Savings Trend
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Track total and confirmed savings by contribution period.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={selectedFilter}
              onValueChange={(value) =>
                setSelectedFilter(value as SavingsFilterValue)
              }>
              <SelectTrigger className="w-45">
                <SelectValue placeholder="Filter by period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All periods</SelectItem>
                <SelectItem value="last-3">Last 3 months</SelectItem>
                <SelectItem value="last-6">Last 6 months</SelectItem>
                <SelectItem value="last-12">Last 12 months</SelectItem>
                {availablePeriods.map((period) => (
                  <SelectItem key={period} value={`period:${period}`}>
                    {formatPeriodLabel(period)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedFilter !== "all" ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFilter("all")}>
                Clear
              </Button>
            ) : null}
          </div>
        </CardHeader>

        <CardContent>
          {isContributionsPending ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader className="h-4 w-4" />
              Building trend chart...
            </div>
          ) : monthlyTrend.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Not enough savings data to draw a trend yet.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {chartLegendItems.map((item) => (
                  <Badge key={item.key} variant="outline" className="gap-1.5">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    {item.label}
                  </Badge>
                ))}
              </div>

              <ChartContainer config={chartConfig} className="h-56 w-full">
                <AreaChart data={monthlyTrend}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) =>
                      new Intl.NumberFormat("en-RW", {
                        notation: "compact",
                      }).format(value)
                    }
                  />
                  <ChartTooltip
                    cursor={false}
                    content={(props) => (
                      <ChartTooltipContent
                        {...props}
                        formatter={(value, name) =>
                          `${String(name)}: ${formatRwf(
                            typeof value === "number"
                              ? value
                              : Number(value || 0)
                          )}`
                        }
                        labelFormatter={(label) => String(label)}
                      />
                    )}
                  />
                  <Area
                    dataKey="total"
                    type="monotone"
                    fill="var(--color-total)"
                    fillOpacity={0.2}
                    stroke="var(--color-total)"
                    strokeWidth={2}
                  />
                  <Area
                    dataKey="confirmed"
                    type="monotone"
                    fill="var(--color-confirmed)"
                    fillOpacity={0.16}
                    stroke="var(--color-confirmed)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Recent Savings Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isContributionsPending ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader className="h-4 w-4" />
                Loading savings records...
              </div>
            ) : recentContributions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Your savings records will appear here once contributions are
                posted.
              </p>
            ) : (
              <div className="space-y-3">
                {recentContributions.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                    <div>
                      <p className="text-sm font-medium">
                        {item.period || "No period"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Recorded {formatDate(item.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold tabular-nums">
                        {formatRwf(item.amount)}
                      </span>
                      <Badge variant={contributionStatusVariant(item.status)}>
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Savings Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">
                Latest Contribution
              </p>
              <p className="mt-1 text-sm font-medium tabular-nums">
                {latestContribution
                  ? formatRwf(latestContribution.amount)
                  : "-"}
              </p>
              <p className="text-xs text-muted-foreground">
                {latestContribution?.period
                  ? `Period ${latestContribution.period}`
                  : "No contribution period available."}
              </p>
            </div>

            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">
                Late Contributions
              </p>
              <p className="mt-1 text-sm font-medium tabular-nums">
                {formatRwf(stats.late)}
              </p>
              <p className="text-xs text-muted-foreground">
                Contributions marked as late.
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Button asChild className="w-full">
                <Link href="/member/contributions">
                  Open Contributions Page
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/member/loans">Open Loans Page</Link>
              </Button>
            </div>

            {isLoansPending ? (
              <p className="text-xs text-muted-foreground">
                Updating loan balances...
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
