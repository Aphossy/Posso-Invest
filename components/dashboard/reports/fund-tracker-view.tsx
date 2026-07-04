"use client"

import { useMemo, useState } from "react"
import {
  exportFundTracker,
  type ReportExportFormat,
} from "@/utils/report-export-utils"
import { format, parse } from "date-fns"
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Briefcase,
  CreditCard,
  Download,
  Scale,
  Wallet,
} from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { useContributions } from "@/hooks/api/use-contributions"
import { useAdminLoans } from "@/hooks/api/use-loans"
import { useAllOperationalExpenses } from "@/hooks/api/use-operational-expenses"
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
import { ExportReportDialog } from "@/components/dashboard/reports/export-report-dialog"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRwf(value: number) {
  return `${new Intl.NumberFormat("en-RW").format(Math.round(value))} RWF`
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

function disbursedMonth(date: string | null | undefined): string | null {
  if (!date) return null
  const d = new Date(date)
  if (isNaN(d.getTime())) return null
  return format(d, "yyyy-MM")
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface MonthSummary {
  period: string
  label: string
  shortLabel: string
  contributions: number
  penalties: number
  income: number
  disbursed: number
  expenses: number
  net: number
  cumulativeBalance: number
}

// ─── Chart config ─────────────────────────────────────────────────────────────

const chartConfig = {
  income: {
    label: "Income",
    theme: { light: "#10b981", dark: "#34d399" },
  },
  disbursed: {
    label: "Loans out",
    theme: { light: "#f97316", dark: "#fb923c" },
  },
  expenses: {
    label: "Op. Expenses",
    theme: { light: "#a855f7", dark: "#c084fc" },
  },
} satisfies ChartConfig

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string
  value: string
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground truncate">{title}</p>
            <p className={`text-2xl font-bold tabular-nums mt-1 ${color}`}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div
            className={`rounded-lg p-2 shrink-0 ${color.replace("text-", "bg-").replace("-600", "-100").replace("-700", "-100")}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FundTrackerView() {
  const [exportOpen, setExportOpen] = useState(false)
  const contributionsQuery = useContributions({ limit: 1000 })
  const { loans, isPending: loansLoading, error: loansError } = useAdminLoans()
  const expensesQuery = useAllOperationalExpenses()

  const contributions = contributionsQuery.data?.data ?? []
  const expensesList = expensesQuery.data?.data ?? []
  const isPending =
    contributionsQuery.isPending || loansLoading || expensesQuery.isPending
  const error =
    contributionsQuery.error ?? loansError ?? expensesQuery.error ?? null

  // ── Totals ────────────────────────────────────────────────────────────────

  const totals = useMemo(() => {
    let confirmedContributions = 0
    let totalPenalties = 0

    for (const c of contributions) {
      if (c.status === "confirmed" || c.status === "late") {
        const amt = Number.parseFloat(String(c.amount) || "0")
        if (!isNaN(amt)) confirmedContributions += amt
      }
      const pen = Number.parseFloat(String(c.penaltyAmount) || "0")
      if (!isNaN(pen) && pen > 0) totalPenalties += pen
    }

    const disbursedStatuses = new Set([
      "disbursed",
      "repaying",
      "repaid",
      "overdue",
    ])
    const outstandingStatuses = new Set(["disbursed", "repaying", "overdue"])

    let totalDisbursed = 0
    let totalOutstanding = 0

    for (const l of loans) {
      const amt = Number.parseFloat(
        String(l.approvedAmount || l.requestedAmount) || "0"
      )
      if (isNaN(amt)) continue
      if (disbursedStatuses.has(l.status)) totalDisbursed += amt
      if (outstandingStatuses.has(l.status)) totalOutstanding += amt
    }

    let totalExpenses = 0
    let pendingExpenses = 0
    let expenseCount = 0

    for (const e of expensesList) {
      const amt = Number.parseFloat(String(e.amount) || "0")
      if (isNaN(amt)) continue
      if (e.status === "approved") {
        totalExpenses += amt
        expenseCount++
      } else if (e.status === "pending") {
        pendingExpenses += amt
      }
    }

    const totalIncome = confirmedContributions + totalPenalties
    const netBalance = totalIncome - totalDisbursed - totalExpenses

    return {
      confirmedContributions,
      totalPenalties,
      totalIncome,
      totalDisbursed,
      totalOutstanding,
      totalExpenses,
      pendingExpenses,
      expenseCount,
      netBalance,
    }
  }, [contributions, loans, expensesList])

  // ── Loan counts ───────────────────────────────────────────────────────────

  const loanCounts = useMemo(() => {
    const counts = { active: 0, overdue: 0, repaid: 0, total: 0 }
    for (const l of loans) {
      if (l.status === "disbursed" || l.status === "repaying") counts.active++
      if (l.status === "overdue") {
        counts.active++
        counts.overdue++
      }
      if (l.status === "repaid") counts.repaid++
      if (["disbursed", "repaying", "repaid", "overdue"].includes(l.status))
        counts.total++
    }
    return counts
  }, [loans])

  // ── Monthly breakdown ─────────────────────────────────────────────────────

  const monthlyData = useMemo((): MonthSummary[] => {
    const byPeriod = new Map<
      string,
      {
        contributions: number
        penalties: number
        disbursed: number
        expenses: number
      }
    >()

    const ensurePeriod = (p: string) => {
      if (!byPeriod.has(p))
        byPeriod.set(p, {
          contributions: 0,
          penalties: 0,
          disbursed: 0,
          expenses: 0,
        })
      return byPeriod.get(p)!
    }

    for (const c of contributions) {
      const period = c.period as string
      if (!period) continue
      const row = ensurePeriod(period)
      if (c.status === "confirmed" || c.status === "late") {
        const amt = Number.parseFloat(String(c.amount) || "0")
        if (!isNaN(amt)) row.contributions += amt
      }
      const pen = Number.parseFloat(String(c.penaltyAmount) || "0")
      if (!isNaN(pen) && pen > 0) row.penalties += pen
    }

    for (const l of loans) {
      if (!["disbursed", "repaying", "repaid", "overdue"].includes(l.status))
        continue
      const month = disbursedMonth(l.disbursedAt as string | null)
      if (!month) continue
      const row = ensurePeriod(month)
      const amt = Number.parseFloat(
        String(l.approvedAmount || l.requestedAmount) || "0"
      )
      if (!isNaN(amt)) row.disbursed += amt
    }

    for (const e of expensesList) {
      if (e.status !== "approved") continue
      const month = disbursedMonth(e.approvedAt ? String(e.approvedAt) : null)
      if (!month) continue
      const row = ensurePeriod(month)
      const amt = Number.parseFloat(String(e.amount) || "0")
      if (!isNaN(amt)) row.expenses += amt
    }

    const sorted = Array.from(byPeriod.entries()).sort(([a], [b]) =>
      a.localeCompare(b)
    )

    let cumulative = 0
    return sorted.map(([period, data]) => {
      const income = data.contributions + data.penalties
      const net = income - data.disbursed - data.expenses
      cumulative += net
      return {
        period,
        label: periodLabel(period),
        shortLabel: periodShortLabel(period),
        contributions: data.contributions,
        penalties: data.penalties,
        income,
        disbursed: data.disbursed,
        expenses: data.expenses,
        net,
        cumulativeBalance: cumulative,
      }
    })
  }, [contributions, loans, expensesList])

  // ─────────────────────────────────────────────────────────────────────────

  if (isPending) {
    return <FundTrackerSkeleton />
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load fund data. Please refresh the page.
        </AlertDescription>
      </Alert>
    )
  }

  const isDeficit = totals.netBalance < 0

  const handleExport = async (fmt: ReportExportFormat, filename?: string) => {
    await exportFundTracker(totals, monthlyData, loanCounts, fmt, filename)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fund Tracker</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track contributions, penalties, and loan disbursements to see the
            group&apos;s net fund position.
          </p>
        </div>
        <Button variant="outline" onClick={() => setExportOpen(true)}>
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      <ExportReportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        reportTitle="Fund Tracker"
        defaultFilename={`fund-tracker-${new Date().toISOString().split("T")[0]}`}
        onExport={handleExport}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 lg:grid-cols-5">
        <KpiCard
          title="Net Fund Balance"
          value={formatRwf(Math.abs(totals.netBalance))}
          subtitle={isDeficit ? "Deficit" : "Surplus"}
          icon={isDeficit ? ArrowDownRight : Scale}
          color={isDeficit ? "text-rose-600" : "text-emerald-600"}
        />
        <KpiCard
          title="Total Income"
          value={formatRwf(totals.totalIncome)}
          subtitle="Contributions + penalties"
          icon={ArrowUpRight}
          color="text-sky-600"
        />
        <KpiCard
          title="Loans Disbursed"
          value={formatRwf(totals.totalDisbursed)}
          subtitle={`${loanCounts.total} loans issued`}
          icon={CreditCard}
          color="text-orange-600"
        />
        <KpiCard
          title="Op. Expenses"
          value={formatRwf(totals.totalExpenses)}
          subtitle={
            totals.pendingExpenses > 0
              ? `+ ${formatRwf(totals.pendingExpenses)} pending`
              : `${totals.expenseCount} approved`
          }
          icon={Briefcase}
          color="text-violet-600"
        />
        <KpiCard
          title="Outstanding Loans"
          value={formatRwf(totals.totalOutstanding)}
          subtitle={`${loanCounts.active} active · ${loanCounts.overdue} overdue`}
          icon={Banknote}
          color={loanCounts.overdue > 0 ? "text-rose-600" : "text-slate-600"}
        />
      </div>

      {/* Monthly Chart */}
      {monthlyData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Income vs Outflows by Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-60 w-full">
              <BarChart
                data={monthlyData}
                margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
                barCategoryGap="30%"
                barGap={2}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="shortLabel"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) =>
                    new Intl.NumberFormat("en-RW", {
                      notation: "compact",
                    }).format(v)
                  }
                  width={52}
                />
                <ChartTooltip
                  content={(props) => (
                    <ChartTooltipContent
                      {...props}
                      formatter={(value) => formatRwf(Number(value))}
                    />
                  )}
                />
                <Bar
                  dataKey="income"
                  fill="var(--color-income)"
                  radius={[3, 3, 0, 0]}
                  name="Income"
                />
                <Bar
                  dataKey="disbursed"
                  fill="var(--color-disbursed)"
                  radius={[3, 3, 0, 0]}
                  name="Loans out"
                />
                <Bar
                  dataKey="expenses"
                  fill="var(--color-expenses)"
                  radius={[3, 3, 0, 0]}
                  name="Op. Expenses"
                />
              </BarChart>
            </ChartContainer>
            <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                Income (contributions + penalties)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-orange-400" />
                Loans disbursed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-purple-400" />
                Operational expenses
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary row */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Income breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4 text-sky-500" />
              Income Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Confirmed contributions
              </span>
              <span className="font-medium tabular-nums text-sm">
                {formatRwf(totals.confirmedContributions)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Penalties collected
              </span>
              <span className="font-medium tabular-nums text-sm">
                {formatRwf(totals.totalPenalties)}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Total Income</span>
              <span className="font-bold tabular-nums text-sky-600">
                {formatRwf(totals.totalIncome)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Operational expenses */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-violet-500" />
              Operational Expenses
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Approved expenses
              </span>
              <span className="font-medium tabular-nums text-sm text-violet-600">
                {formatRwf(totals.totalExpenses)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Pending approval
              </span>
              <span className="font-medium tabular-nums text-sm text-amber-600">
                {formatRwf(totals.pendingExpenses)}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Total Deducted</span>
              <span className="font-bold tabular-nums text-violet-600">
                {formatRwf(totals.totalExpenses)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Loan portfolio */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-orange-500" />
              Loan Portfolio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Total disbursed (all time)
              </span>
              <span className="font-medium tabular-nums text-sm">
                {formatRwf(totals.totalDisbursed)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Outstanding (not yet repaid)
              </span>
              <span className="font-medium tabular-nums text-sm">
                {formatRwf(totals.totalOutstanding)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Active / Overdue / Repaid
              </span>
              <div className="flex gap-1 flex-wrap justify-end">
                <Badge variant="secondary" className="text-xs tabular-nums">
                  {loanCounts.active - loanCounts.overdue} active
                </Badge>
                {loanCounts.overdue > 0 && (
                  <Badge variant="destructive" className="text-xs tabular-nums">
                    {loanCounts.overdue} overdue
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs tabular-nums">
                  {loanCounts.repaid} repaid
                </Badge>
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Net Balance</span>
              <span
                className={`font-bold tabular-nums ${isDeficit ? "text-rose-600" : "text-emerald-600"}`}>
                {isDeficit ? "−" : ""}
                {formatRwf(Math.abs(totals.netBalance))}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly table */}
      {monthlyData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Period-by-Period Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Contributions</TableHead>
                  <TableHead className="text-right">Penalties</TableHead>
                  <TableHead className="text-right">Income</TableHead>
                  <TableHead className="text-right">Loans Out</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead className="text-right">Cumulative</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...monthlyData].reverse().map((row) => (
                  <TableRow key={row.period}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {row.contributions > 0
                        ? formatRwf(row.contributions)
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {row.penalties > 0 ? (
                        <span className="text-amber-600">
                          {formatRwf(row.penalties)}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm font-medium text-sky-700">
                      {row.income > 0 ? formatRwf(row.income) : "-"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {row.disbursed > 0 ? (
                        <span className="text-orange-600">
                          {formatRwf(row.disbursed)}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {row.expenses > 0 ? (
                        <span className="text-violet-600">
                          {formatRwf(row.expenses)}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm font-medium">
                      <span
                        className={
                          row.net >= 0 ? "text-emerald-600" : "text-rose-600"
                        }>
                        {row.net >= 0 ? "+" : "−"}
                        {formatRwf(Math.abs(row.net))}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm font-semibold">
                      <span
                        className={
                          row.cumulativeBalance >= 0
                            ? "text-emerald-700"
                            : "text-rose-700"
                        }>
                        {row.cumulativeBalance >= 0 ? "" : "−"}
                        {formatRwf(Math.abs(row.cumulativeBalance))}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function FundTrackerSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-5">
          <Skeleton className="h-60 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}
