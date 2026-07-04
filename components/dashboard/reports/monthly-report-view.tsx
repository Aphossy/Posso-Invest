"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { siteConfig } from "@/constants/site-config"
import {
  exportMonthlyReport,
  type ReportExportFormat,
} from "@/utils/report-export-utils"
import {
  addMonths,
  format,
  isSameMonth,
  isWithinInterval,
  parse,
  subMonths,
} from "date-fns"
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  RefreshCcw,
  Sparkles,
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
  Pie,
  PieChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts"

import { getActivePeriod, getWindowForPeriod } from "@/lib/contribution-window"
import { useContributions } from "@/hooks/api/use-contributions"
import { useAdminLoans } from "@/hooks/api/use-loans"
import { useMeetings } from "@/hooks/api/use-meetings"
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

function formatDate(value?: string | Date | null) {
  if (!value) return "-"
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return format(date, "MMM d, yyyy")
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

const STATUS_COLORS: Record<string, string> = {
  confirmed: "#10b981",
  pending: "#f59e0b",
  late: "#ef4444",
  waived: "#71717a",
  missing: "#d1d5db",
}

function statusColor(status?: string) {
  return STATUS_COLORS[status ?? "missing"] ?? STATUS_COLORS.missing
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

// ─── Chart configs ────────────────────────────────────────────────────────

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

const memberChartConfig = {
  amount: { label: "Amount" },
} satisfies ChartConfig

const statusChartConfig = {
  confirmed: { label: "Confirmed", color: "#10b981" },
  pending: { label: "Pending", color: "#f59e0b" },
  late: { label: "Late", color: "#ef4444" },
  waived: { label: "Waived", color: "#71717a" },
  missing: { label: "Missing", color: "#d1d5db" },
} satisfies ChartConfig

// ─── Sub-components ───────────────────────────────────────────────────────

/** Thin dual-tone progress bar - confirmed (green) + pending (amber) over expected */
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

/** Donut chart - member count by contribution status */
function StatusDonutChart({
  confirmed,
  pending,
  late,
  waived,
}: {
  confirmed: number
  pending: number
  late: number
  waived: number
}) {
  const missing = Math.max(
    0,
    membershipCount - confirmed - pending - late - waived
  )
  const data = [
    {
      name: "confirmed",
      label: "Confirmed",
      value: confirmed,
      color: STATUS_COLORS.confirmed,
    },
    {
      name: "pending",
      label: "Pending",
      value: pending,
      color: STATUS_COLORS.pending,
    },
    { name: "late", label: "Late", value: late, color: STATUS_COLORS.late },
    {
      name: "waived",
      label: "Waived",
      value: waived,
      color: STATUS_COLORS.waived,
    },
    {
      name: "missing",
      label: "No record",
      value: missing,
      color: STATUS_COLORS.missing,
    },
  ].filter((d) => d.value > 0)

  if (data.length === 0) return null

  return (
    <ChartContainer
      config={statusChartConfig}
      className="mx-auto h-52 w-full max-w-[260px]">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          cx="50%"
          cy="50%"
          innerRadius="52%"
          outerRadius="78%"
          paddingAngle={2}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} stroke="transparent" />
          ))}
        </Pie>
        <ChartTooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const item = payload[0]
            return (
              <div className="border-border/50 bg-background rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
                <div className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: item.payload.color }}
                  />
                  <span className="font-medium">{item.payload.label}</span>
                  <span className="text-muted-foreground">
                    {item.value} member{Number(item.value) !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            )
          }}
        />
      </PieChart>
    </ChartContainer>
  )
}

/** Horizontal bar chart - one bar per member, coloured by status */
function MemberAmountsChart({
  data,
}: {
  data: { name: string; amount: number; status: string }[]
}) {
  if (data.length === 0) return null

  return (
    <div className="w-full overflow-x-auto">
      <ChartContainer
        config={memberChartConfig}
        className="min-w-[280px] w-full"
        style={{ height: Math.max(160, data.length * 38) }}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 16, bottom: 0, left: 4 }}>
          <CartesianGrid horizontal={false} />
          <XAxis
            type="number"
            dataKey="amount"
            tickLine={false}
            axisLine={false}
            tickFormatter={formatRwfCompact}
            tick={{ fontSize: 10 }}
          />
          <YAxis
            type="category"
            dataKey="name"
            tickLine={false}
            axisLine={false}
            width={88}
            tick={{ fontSize: 11 }}
          />
          <ChartTooltip
            cursor={false}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const item = payload[0]
              return (
                <div className="border-border/50 bg-background rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
                  <p className="font-medium">{item.payload.name}</p>
                  <p className="text-muted-foreground">
                    {formatRwf(item.payload.amount)} ·{" "}
                    <span className="capitalize">{item.payload.status}</span>
                  </p>
                </div>
              )
            }}
          />
          <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={statusColor(entry.status)} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  )
}

/** Composed chart - 6 months of bars (collected) + line (confirmed) + target reference */
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

/** Segmented bar showing payment method distribution */
function PaymentMethodBar({
  data,
}: {
  data: { method: string; count: number; color: string }[]
}) {
  const total = data.reduce((s, d) => s + d.count, 0)
  if (total === 0) return null

  const methodLabel = (m: string) =>
    m === "momo"
      ? "Mobile Money"
      : m === "cash"
        ? "Cash"
        : m === "bank"
          ? "Bank Transfer"
          : m

  return (
    <div className="space-y-2">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full">
        {data.map((d) => (
          <div
            key={d.method}
            className="transition-all"
            style={{
              width: `${(d.count / total) * 100}%`,
              backgroundColor: d.color,
            }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {data.map((d) => (
          <span key={d.method} className="flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: d.color }}
            />
            {methodLabel(d.method)} ({d.count})
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────

export function MonthlyReportView() {
  const today = new Date()
  const activePeriod = useMemo(() => getActivePeriod(), [])
  const currentCalendarPeriod = useMemo(() => format(today, "yyyy-MM"), [])

  const [selectedPeriod, setSelectedPeriod] = useState(activePeriod)
  const [exportOpen, setExportOpen] = useState(false)

  const periodDate = useMemo(
    () => parse(selectedPeriod, "yyyy-MM", new Date()),
    [selectedPeriod]
  )

  const isAtActivePeriod = selectedPeriod === activePeriod
  const isAtCurrentCalendarMonth = selectedPeriod === currentCalendarPeriod
  // Ahead of the contribution window but within the current calendar month
  const isAheadOfWindow =
    selectedPeriod > activePeriod && selectedPeriod <= currentCalendarPeriod
  const isFuture = selectedPeriod > currentCalendarPeriod

  // Current period details
  const {
    data: contribData,
    isPending: contribPending,
    isRefetching: contribRefetching,
    error: contribError,
    refetch: refetchContribs,
  } = useContributions({ period: selectedPeriod, limit: 200 })

  // All contributions - used for 6-month trend
  const { data: allContribData, isPending: trendPending } = useContributions({
    limit: 600,
  })

  // All loans
  const {
    loans: allLoans,
    isPending: loansPending,
    isRefetching: loansRefetching,
    error: loansError,
    refetch: refetchLoans,
  } = useAdminLoans()

  // Meetings
  const {
    data: meetingsData,
    isPending: meetingsPending,
    isRefetching: meetingsRefetching,
    error: meetingsError,
    refetch: refetchMeetings,
  } = useMeetings({ limit: 200 })

  const contributions = useMemo(() => contribData?.data ?? [], [contribData])
  const allContributions = useMemo(
    () => allContribData?.data ?? [],
    [allContribData]
  )

  const monthLoans = useMemo(
    () =>
      allLoans.filter(
        (l) =>
          inMonth(l.requestedAt, periodDate) ||
          inMonth(l.disbursedAt, periodDate) ||
          inMonth(l.approvedAt, periodDate)
      ),
    [allLoans, periodDate]
  )

  const monthMeetings = useMemo(
    () =>
      (meetingsData?.data ?? []).filter((m) =>
        inMonth(m.scheduledAt, periodDate)
      ),
    [meetingsData, periodDate]
  )

  // ── Summaries ────────────────────────────────────────────────────────────

  const contribSummary = useMemo(() => {
    let collected = 0
    let confirmed = 0
    let penalties = 0
    let pendingCount = 0
    let lateCount = 0
    let waivedCount = 0
    let penaltyCount = 0

    for (const c of contributions) {
      const amount = Number.parseFloat(c.amount || "0")
      const safe = Number.isNaN(amount) ? 0 : amount
      collected += safe
      if (c.status === "confirmed") confirmed += safe
      if (c.status === "pending") pendingCount++
      if (c.status === "late") lateCount++
      if (c.status === "waived") waivedCount++

      // Accumulate penalties regardless of status — a late fee may be recorded
      // on a record that has already been confirmed
      const p = Number.parseFloat(c.penaltyAmount || "0")
      if (!Number.isNaN(p) && p > 0) {
        penalties += p
        penaltyCount++
      }
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
      penalties,
      pendingCount,
      lateCount,
      penaltyCount,
      waivedCount,
      confirmedCount,
      expected,
      compliance,
      total: contributions.length,
    }
  }, [contributions])

  const loanSummary = useMemo(() => {
    const requested = monthLoans.filter(
      (l) => l.status === "requested" && inMonth(l.requestedAt, periodDate)
    )
    const disbursed = monthLoans.filter(
      (l) => l.disbursedAt && inMonth(l.disbursedAt, periodDate)
    )
    const approved = monthLoans.filter(
      (l) => l.approvedAt && inMonth(l.approvedAt, periodDate)
    )
    const disbursedTotal = disbursed.reduce((sum, l) => {
      const v = Number.parseFloat(l.approvedAmount || l.requestedAmount || "0")
      return sum + (Number.isNaN(v) ? 0 : v)
    }, 0)
    return { requested, disbursed, approved, disbursedTotal }
  }, [monthLoans, periodDate])

  // ── Chart data ────────────────────────────────────────────────────────────

  const memberBarData = useMemo(
    () =>
      contributions
        .map((c) => ({
          name: (c.memberName || "Unknown").split(" ").slice(0, 2).join(" "),
          amount: Number.parseFloat(c.amount || "0") || 0,
          status: c.status || "pending",
        }))
        .sort((a, b) => b.amount - a.amount),
    [contributions]
  )

  // 6-month trend relative to selected period
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

  // Payment method breakdown
  const paymentMethodData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const c of contributions) {
      const method = c.metadata?.paymentMethod || "unknown"
      counts[method] = (counts[method] || 0) + 1
    }
    const COLORS: Record<string, string> = {
      momo: "#f59e0b",
      cash: "#10b981",
      bank: "#6366f1",
      unknown: "#d1d5db",
    }
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([method, count]) => ({
        method,
        count,
        color: COLORS[method] ?? "#d1d5db",
      }))
  }, [contributions])

  // Quick highlights
  const insights = useMemo(() => {
    const list: string[] = []
    const noRecord = membershipCount - contribSummary.total
    if (noRecord > 0)
      list.push(
        `${noRecord} member${noRecord > 1 ? "s" : ""} have no contribution record yet.`
      )
    if (contribSummary.penaltyCount > 0)
      list.push(
        `${contribSummary.penaltyCount} late payment${contribSummary.penaltyCount > 1 ? "s" : ""} incurring ${formatRwf(contribSummary.penalties)} in penalties.`
      )
    if (contribSummary.compliance === 100)
      list.push("All members have confirmed contributions this month.")
    if (loanSummary.disbursed.length > 0)
      list.push(
        `${loanSummary.disbursed.length} loan${loanSummary.disbursed.length > 1 ? "s" : ""} disbursed this month totalling ${formatRwf(loanSummary.disbursedTotal)}.`
      )
    const held = monthMeetings.filter((m) => m.status === "completed").length
    if (held > 0)
      list.push(`${held} meeting${held > 1 ? "s" : ""} held this month.`)
    return list.slice(0, 4)
  }, [contribSummary, loanSummary, monthMeetings])

  const isRefetching =
    contribRefetching || loansRefetching || meetingsRefetching
  const isInitialLoading = contribPending && contributions.length === 0
  const errors = [contribError, loansError, meetingsError].filter(Boolean)

  async function handleRefresh() {
    await Promise.all([refetchContribs(), refetchLoans(), refetchMeetings()])
  }

  async function handleExport(fmt: ReportExportFormat, filename?: string) {
    await exportMonthlyReport(
      periodLabel(selectedPeriod),
      contribSummary,
      {
        requestedCount: loanSummary.requested.length,
        approvedCount: loanSummary.approved.length,
        disbursedCount: loanSummary.disbursed.length,
        disbursedTotal: loanSummary.disbursedTotal,
      },
      contributions,
      monthLoans,
      monthMeetings,
      fmt,
      filename
    )
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
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Monthly Report</h1>
            <p className="text-sm text-muted-foreground">
              Full financial summary for any selected month.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setExportOpen(true)}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button
            variant="outline"
            onClick={() => void handleRefresh()}
            disabled={isRefetching}>
            <RefreshCcw className="h-4 w-4" />
            {isRefetching ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      <ExportReportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        reportTitle="Monthly Report"
        defaultFilename={`monthly-report-${selectedPeriod}`}
        onExport={handleExport}
      />

      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            {errors[0]?.help ||
              errors[0]?.message ||
              "Unable to load report data."}
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
                disabled={selectedPeriod >= currentCalendarPeriod}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {isAtActivePeriod && <Badge variant="info">Active window</Badge>}
              {isAheadOfWindow && (
                <Badge variant="warning">Ahead of window</Badge>
              )}
              {isFuture && <Badge variant="outline">Future</Badge>}
              {!isAtActivePeriod && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedPeriod(activePeriod)}>
                  Back to active window
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ahead-of-window notice */}
      {isAheadOfWindow && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            The contribution window for{" "}
            <strong>{periodLabel(selectedPeriod)}</strong> has not opened yet —
            contribution records will be empty. Loan requests submitted this
            month are visible below.
          </AlertDescription>
        </Alert>
      )}

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-base font-semibold">Contributions</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Collected</CardTitle>
              <Wallet className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              {isInitialLoading ? (
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
              {isInitialLoading ? (
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
              {isInitialLoading ? (
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
              <CardTitle className="text-sm font-medium">Penalties</CardTitle>
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            </CardHeader>
            <CardContent>
              {isInitialLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className="text-2xl font-semibold tabular-nums">
                    {formatRwf(contribSummary.penalties)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(latePenaltyRate * 100).toFixed(0)}% rate on late payments
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Visual Overview ────────────────────────────────────────────────── */}
      {!isInitialLoading && contributions.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-base font-semibold">Visual Overview</h2>

          {/* Row 1: Progress + Highlights */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Collection Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <CollectionProgressBar
                  confirmed={contribSummary.confirmed}
                  collected={contribSummary.collected}
                  expected={contribSummary.expected}
                />
                {paymentMethodData.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Payment methods
                      </p>
                      <PaymentMethodBar data={paymentMethodData} />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {insights.length > 0 ? (
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
                        <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
                        {insight}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}
          </div>

          {/* Row 2: Status donut + Member bar chart */}
          <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Status Breakdown
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Members by contribution status
                </p>
              </CardHeader>
              <CardContent className="overflow-hidden">
                <StatusDonutChart
                  confirmed={contribSummary.confirmedCount}
                  pending={contribSummary.pendingCount}
                  late={contribSummary.lateCount}
                  waived={contribSummary.waivedCount}
                />
                <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                  {(
                    [
                      { key: "confirmed", label: "Confirmed" },
                      { key: "pending", label: "Pending" },
                      { key: "late", label: "Late" },
                      { key: "waived", label: "Waived" },
                      { key: "missing", label: "No record" },
                    ] as const
                  ).map((item) => (
                    <span key={item.key} className="flex items-center gap-1">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: STATUS_COLORS[item.key] }}
                      />
                      {item.label}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Per-Member Contribution
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Amount per member, coloured by status
                </p>
              </CardHeader>
              <CardContent>
                <MemberAmountsChart data={memberBarData} />
              </CardContent>
            </Card>
          </div>

          {/* Row 3: 6-month trend */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                6-Month Collection Trend
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Bars: total collected · Line: confirmed · Dashed: monthly target
                ({formatRwf(membershipCount * monthlyContributionRwf)})
              </p>
            </CardHeader>
            <CardContent>
              {trendPending && allContributions.length === 0 ? (
                <Skeleton className="h-56 w-full" />
              ) : (
                <>
                  <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-3 rounded-sm bg-sky-400/65" />
                      Collected
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-0.5 w-4 bg-emerald-500" />
                      Confirmed
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-0 w-4 border-t-2 border-dashed border-indigo-400" />
                      Target
                    </span>
                  </div>
                  <CollectionTrendChart data={trendData} />
                </>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {/* ── Contributions Table ───────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base font-semibold">
            Member Contributions - {periodLabel(selectedPeriod)}
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            {!isInitialLoading && contribSummary.total > 0 && (
              <>
                {contribSummary.confirmedCount > 0 && (
                  <Badge variant="success">
                    {contribSummary.confirmedCount} confirmed
                  </Badge>
                )}
                {contribSummary.pendingCount > 0 && (
                  <Badge variant="warning">
                    {contribSummary.pendingCount} pending
                  </Badge>
                )}
                {contribSummary.lateCount > 0 && (
                  <Badge variant="danger">
                    {contribSummary.lateCount} late
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
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <Users className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">
                No contributions recorded for this period.
              </p>
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
                  <TableHead>Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contributions.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <p className="font-medium">{c.memberName || "Unknown"}</p>
                      {c.memberEmail && (
                        <p className="text-xs text-muted-foreground">
                          {c.memberEmail}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={statusVariant(c.status)}
                        className="capitalize">
                        {c.status || "unknown"}
                      </Badge>
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
                    <TableCell className="text-sm">
                      {formatDate(c.paidAt)}
                    </TableCell>
                    <TableCell className="text-sm capitalize">
                      {c.metadata?.paymentMethod === "momo"
                        ? "Mobile Money"
                        : c.metadata?.paymentMethod || (
                            <span className="text-muted-foreground">-</span>
                          )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Loan Activity ─────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-base font-semibold">Loan Activity</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Requested</CardTitle>
              <Banknote className="h-4 w-4 text-violet-500" />
            </CardHeader>
            <CardContent>
              {loansPending ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-semibold">
                    {loanSummary.requested.length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    New loan requests
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              {loansPending ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-semibold">
                    {loanSummary.approved.length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Approved this month
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Disbursed</CardTitle>
              <Wallet className="h-4 w-4 text-cyan-500" />
            </CardHeader>
            <CardContent>
              {loansPending ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className="text-2xl font-semibold tabular-nums">
                    {formatRwf(loanSummary.disbursedTotal)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {loanSummary.disbursed.length} loan
                    {loanSummary.disbursed.length !== 1 ? "s" : ""} disbursed
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {!loansPending && monthLoans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Loans - {periodLabel(selectedPeriod)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Approved</TableHead>
                  <TableHead>Interest</TableHead>
                  <TableHead>Requested Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthLoans.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <p className="font-medium">{l.memberName || "Unknown"}</p>
                      {l.memberEmail && (
                        <p className="text-xs text-muted-foreground">
                          {l.memberEmail}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={loanStatusVariant(l.status)}
                        className="capitalize">
                        {l.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatRwf(l.requestedAmount)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {l.approvedAmount ? (
                        formatRwf(l.approvedAmount)
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {(interestRate * 100).toFixed(0)}%
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(l.requestedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ── Meetings ──────────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-base font-semibold">Meetings</h2>
        {meetingsPending ? (
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ) : monthMeetings.length === 0 ? (
          <Card>
            <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              No meetings scheduled or held this month.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Host Contribution</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthMeetings.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.title}</TableCell>
                      <TableCell className="text-sm">
                        {formatDate(m.scheduledAt)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            m.status === "completed"
                              ? "success"
                              : m.status === "cancelled"
                                ? "danger"
                                : "warning"
                          }
                          className="capitalize">
                          {m.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {m.location || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="tabular-nums text-sm">
                        {m.hostContribution ? (
                          formatRwf(m.hostContribution)
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </section>

      {/* ── Financial Summary ─────────────────────────────────────────────── */}
      {!isInitialLoading && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              {periodLabel(selectedPeriod)} - Financial Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">
                  Expected contributions
                </p>
                <p className="text-lg font-semibold tabular-nums">
                  {formatRwf(contribSummary.expected)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {membershipCount} members ×{" "}
                  {formatRwf(monthlyContributionRwf)}
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">
                  Confirmed savings
                </p>
                <p className="text-lg font-semibold tabular-nums">
                  {formatRwf(contribSummary.confirmed)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {contribSummary.compliance}% compliance rate
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Shortfall</p>
                <p className="text-lg font-semibold tabular-nums">
                  {formatRwf(
                    Math.max(
                      0,
                      contribSummary.expected - contribSummary.confirmed
                    )
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  Unconfirmed amount
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">
                  Penalties collected
                </p>
                <p className="text-lg font-semibold tabular-nums text-red-600 dark:text-red-400">
                  {formatRwf(contribSummary.penalties)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {contribSummary.penaltyCount} late payment
                  {contribSummary.penaltyCount !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Loans disbursed</p>
                <p className="text-lg font-semibold tabular-nums">
                  {formatRwf(loanSummary.disbursedTotal)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {loanSummary.disbursed.length} disbursement
                  {loanSummary.disbursed.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Meetings held</p>
                <p className="text-lg font-semibold">
                  {monthMeetings.filter((m) => m.status === "completed").length}
                </p>
                <p className="text-xs text-muted-foreground">
                  of {monthMeetings.length} scheduled
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
