"use client"

import { useMemo, useState } from "react"
import { siteConfig } from "@/constants/site-config"
import { addMonths, format, parse, subMonths } from "date-fns"
import {
  Activity,
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Info,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react"
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts"

import { useContributions } from "@/hooks/api/use-contributions"
import { useAdminLoans } from "@/hooks/api/use-loans"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const { monthlyContributionRwf } = siteConfig.platform.savings
const { membershipCount } = siteConfig.platform.governance
const { interestRate } = siteConfig.platform.loans

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRwf(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(value)) return "-"
  return `${new Intl.NumberFormat("en-RW").format(Math.round(value))} RWF`
}

function formatRwfCompact(value: number) {
  return new Intl.NumberFormat("en-RW", { notation: "compact" }).format(
    Math.round(value)
  )
}

function formatPct(value: number) {
  return `${Math.round(value * 100)}%`
}

type Scenario = "conservative" | "realistic" | "optimistic"

const SCENARIO_LABELS: Record<Scenario, string> = {
  conservative: "Conservative",
  realistic: "Realistic",
  optimistic: "Optimistic",
}

const SCENARIO_COLORS: Record<Scenario, string> = {
  conservative: "#f59e0b",
  realistic: "#0ea5e9",
  optimistic: "#10b981",
}

const projectionChartConfig = {
  contribution: {
    label: "Contributions",
    theme: { light: "#0ea5e9", dark: "#38bdf8" },
  },
  cumulative: {
    label: "Cumulative Fund",
    theme: { light: "#10b981", dark: "#34d399" },
  },
} satisfies ChartConfig

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScenarioBadge({
  rate,
  scenario,
}: {
  rate: number
  scenario: Scenario
}) {
  const color = SCENARIO_COLORS[scenario]
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${color}20`, color }}>
      {SCENARIO_LABELS[scenario]} · {formatPct(rate)} compliance
    </span>
  )
}

function RiskBadge({ rate }: { rate: number }) {
  if (rate >= 0.9)
    return (
      <Badge variant="success" className="text-xs">
        Low risk
      </Badge>
    )
  if (rate >= 0.7)
    return (
      <Badge variant="warning" className="text-xs">
        Medium risk
      </Badge>
    )
  return (
    <Badge variant="danger" className="text-xs">
      High risk
    </Badge>
  )
}

function ComplianceBar({ rate }: { rate: number }) {
  const color = rate >= 0.9 ? "#10b981" : rate >= 0.7 ? "#f59e0b" : "#ef4444"
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-2 w-20 overflow-hidden rounded-full bg-muted">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all"
          style={{ width: `${rate * 100}%`, backgroundColor: color }}
        />
      </div>
      <span className="tabular-nums text-xs text-muted-foreground">
        {Math.round(rate * 100)}%
      </span>
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function ProjectionsView() {
  const today = useMemo(() => new Date(), [])
  const [scenario, setScenario] = useState<Scenario>("realistic")

  const { data: contribData, isPending: contribPending } = useContributions({
    limit: 1000,
  })
  const { loans: allLoans, isPending: loansPending } = useAdminLoans()

  const allContributions = useMemo(() => contribData?.data ?? [], [contribData])

  // ── Historical compliance (last 6 months) ────────────────────────────────

  const historicalRate = useMemo(() => {
    const months: string[] = []
    for (let i = 1; i <= 6; i++) {
      months.push(format(subMonths(today, i), "yyyy-MM"))
    }
    const rates: number[] = []
    for (const m of months) {
      const mContribs = allContributions.filter((c) => c.period === m)
      if (mContribs.length === 0) continue
      const confirmed = mContribs.filter((c) => c.status === "confirmed").length
      rates.push(confirmed / membershipCount)
    }
    if (rates.length === 0) return 0.8
    return rates.reduce((a, b) => a + b, 0) / rates.length
  }, [allContributions, today])

  const scenarioRates: Record<Scenario, number> = useMemo(
    () => ({
      conservative: Math.max(0.5, historicalRate - 0.15),
      realistic: historicalRate,
      optimistic: Math.min(1.0, historicalRate + 0.1),
    }),
    [historicalRate]
  )

  const activeRate = scenarioRates[scenario]

  // ── Active loan portfolio ────────────────────────────────────────────────

  const activeLoans = useMemo(
    () =>
      allLoans.filter(
        (l) =>
          l.status === "disbursed" ||
          l.status === "repaying" ||
          l.status === "approved"
      ),
    [allLoans]
  )

  const totalOutstanding = useMemo(
    () =>
      activeLoans.reduce((sum, l) => {
        const v = Number.parseFloat(
          l.approvedAmount || l.requestedAmount || "0"
        )
        return sum + (Number.isNaN(v) ? 0 : v)
      }, 0),
    [activeLoans]
  )

  const projectedInterestIncome = totalOutstanding * interestRate

  // ── 12-month projection chart data ──────────────────────────────────────

  const projectionMonths = useMemo(() => {
    const monthlyContrib = membershipCount * monthlyContributionRwf * activeRate
    let cumulative = 0

    // Add historical cumulative base (total confirmed to date)
    const confirmedToDate = allContributions
      .filter((c) => c.status === "confirmed")
      .reduce((sum, c) => {
        const v = Number.parseFloat(c.amount || "0")
        return sum + (Number.isNaN(v) ? 0 : v)
      }, 0)

    cumulative = confirmedToDate

    return Array.from({ length: 12 }, (_, i) => {
      const monthDate = addMonths(today, i + 1)
      const isYearEnd = monthDate.getMonth() === 11
      cumulative += monthlyContrib
      return {
        label: format(monthDate, "MMM yy"),
        contribution: Math.round(monthlyContrib),
        cumulative: Math.round(cumulative),
        isYearEnd,
      }
    })
  }, [activeRate, allContributions, today])

  // ── Year-end fund estimate ───────────────────────────────────────────────

  const yearEndFund = useMemo(() => {
    const confirmedToDate = allContributions
      .filter((c) => c.status === "confirmed")
      .reduce((sum, c) => {
        const v = Number.parseFloat(c.amount || "0")
        return sum + (Number.isNaN(v) ? 0 : v)
      }, 0)

    // Months remaining until December
    const decIdx = projectionMonths.findIndex((m) => m.isYearEnd)
    const remainingMonths = decIdx >= 0 ? decIdx + 1 : 12
    const monthlyContrib = membershipCount * monthlyContributionRwf * activeRate
    return (
      confirmedToDate +
      remainingMonths * monthlyContrib +
      projectedInterestIncome
    )
  }, [allContributions, projectionMonths, activeRate, projectedInterestIncome])

  const projectedSharePerMember = yearEndFund / membershipCount

  // ── Per-member compliance history ────────────────────────────────────────

  const memberRisk = useMemo(() => {
    const pastMonths: string[] = []
    for (let i = 1; i <= 6; i++) {
      pastMonths.push(format(subMonths(today, i), "yyyy-MM"))
    }
    const memberMap = new Map<
      string,
      { name: string; email: string; confirmed: number; total: number }
    >()

    for (const c of allContributions) {
      if (!pastMonths.includes(c.period ?? "")) continue
      const key = c.memberId || c.memberEmail || c.memberName || "unknown"
      if (!memberMap.has(key)) {
        memberMap.set(key, {
          name: c.memberName || "Unknown",
          email: c.memberEmail || "",
          confirmed: 0,
          total: 0,
        })
      }
      const entry = memberMap.get(key)!
      entry.total++
      if (c.status === "confirmed") entry.confirmed++
    }

    return Array.from(memberMap.values())
      .map((m) => ({
        ...m,
        rate: m.total > 0 ? m.confirmed / m.total : 0,
      }))
      .sort((a, b) => a.rate - b.rate)
  }, [allContributions, today])

  // ── KPI card values ──────────────────────────────────────────────────────

  const projected12mContrib = useMemo(
    () => projectionMonths.reduce((sum, m) => sum + m.contribution, 0),
    [projectionMonths]
  )

  const isLoading =
    (contribPending && allContributions.length === 0) || loansPending

  return (
    <div className="flex-1 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Financial Projections</h1>
          <p className="text-sm text-muted-foreground">
            Forward-looking estimates based on historical compliance and the
            active loan portfolio.
          </p>
        </div>
      </div>

      {/* Scenario Tabs */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Projection scenario</p>
              <p className="text-xs text-muted-foreground">
                Historical 6-month compliance:{" "}
                <span className="font-medium">{formatPct(historicalRate)}</span>
              </p>
            </div>
            <Tabs
              value={scenario}
              onValueChange={(v) => setScenario(v as Scenario)}>
              <TabsList>
                <TabsTrigger value="conservative" className="gap-1.5">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: SCENARIO_COLORS.conservative }}
                  />
                  Conservative
                </TabsTrigger>
                <TabsTrigger value="realistic" className="gap-1.5">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: SCENARIO_COLORS.realistic }}
                  />
                  Realistic
                </TabsTrigger>
                <TabsTrigger value="optimistic" className="gap-1.5">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: SCENARIO_COLORS.optimistic }}
                  />
                  Optimistic
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <ScenarioBadge rate={activeRate} scenario={scenario} />
          </div>
        </CardContent>
      </Card>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Projections are estimates only. Conservative assumes{" "}
          {formatPct(scenarioRates.conservative)} compliance, Realistic uses
          your historical average of {formatPct(historicalRate)}, and Optimistic
          assumes {formatPct(scenarioRates.optimistic)} compliance. Interest
          income is computed on the current outstanding loan balance.
        </AlertDescription>
      </Alert>

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-base font-semibold">12-Month Summary</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Projected Contributions
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-sky-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className="text-2xl font-semibold tabular-nums">
                    {formatRwf(projected12mContrib)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Next 12 months · {formatPct(activeRate)} compliance
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Expected Interest Income
              </CardTitle>
              <Banknote className="h-4 w-4 text-violet-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className="text-2xl font-semibold tabular-nums">
                    {formatRwf(projectedInterestIncome)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatPct(interestRate)} on {formatRwf(totalOutstanding)}{" "}
                    outstanding
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Estimated Year-End Fund
              </CardTitle>
              <Target className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className="text-2xl font-semibold tabular-nums">
                    {formatRwf(yearEndFund)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Savings + projected contribs + interest
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Share-Out per Member
              </CardTitle>
              <Wallet className="h-4 w-4 text-cyan-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className="text-2xl font-semibold tabular-nums">
                    {formatRwf(projectedSharePerMember)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Estimated per member at year-end
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── 12-Month Outlook Chart ─────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
            <Activity className="h-4 w-4 text-sky-500" />
            12-Month Outlook
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Bars: projected monthly contributions · Line: cumulative confirmed
            savings
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-56 w-full" />
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-3 rounded-sm"
                    style={{
                      backgroundColor: `${SCENARIO_COLORS[scenario]}99`,
                    }}
                  />
                  Monthly contribution
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-0.5 w-4 bg-emerald-500" />
                  Cumulative fund
                </span>
              </div>
              <ChartContainer
                config={projectionChartConfig}
                className="h-64 w-full">
                <ComposedChart
                  data={projectionMonths}
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
                    yAxisId="left"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatRwfCompact}
                    tick={{ fontSize: 10 }}
                    tickMargin={8}
                    width={56}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatRwfCompact}
                    tick={{ fontSize: 10 }}
                    tickMargin={8}
                    width={56}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      return (
                        <div className="border-border/50 bg-background rounded-lg border px-2.5 py-2 text-xs shadow-xl">
                          <p className="mb-1 font-medium">{label}</p>
                          {payload.map((p) => (
                            <p
                              key={p.dataKey}
                              className="text-muted-foreground">
                              <span style={{ color: p.color }}>■</span> {p.name}
                              :{" "}
                              {formatRwf(
                                typeof p.value === "number"
                                  ? p.value
                                  : Number(p.value)
                              )}
                            </p>
                          ))}
                        </div>
                      )
                    }}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="contribution"
                    name="Monthly"
                    fill={SCENARIO_COLORS[scenario]}
                    fillOpacity={0.6}
                    radius={[3, 3, 0, 0]}
                  />
                  <Line
                    yAxisId="right"
                    dataKey="cumulative"
                    name="Cumulative"
                    type="monotone"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 2.5, fill: "#10b981", strokeWidth: 0 }}
                    activeDot={{ r: 4 }}
                  />
                </ComposedChart>
              </ChartContainer>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Active Loan Repayment Schedule ────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-base font-semibold">
            <Banknote className="h-4 w-4 text-violet-500" />
            Active Loan Portfolio
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Outstanding loans and expected interest income.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {loansPending ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : activeLoans.length === 0 ? (
            <div className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              No active loans outstanding. All loans are fully repaid.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Principal</TableHead>
                  <TableHead>Expected Interest</TableHead>
                  <TableHead>Total Repayable</TableHead>
                  <TableHead>Disbursed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeLoans.map((l) => {
                  const principal = Number.parseFloat(
                    l.approvedAmount || l.requestedAmount || "0"
                  )
                  const safeP = Number.isNaN(principal) ? 0 : principal
                  const interest = safeP * interestRate
                  return (
                    <TableRow key={l.id}>
                      <TableCell>
                        <p className="font-medium">
                          {l.memberName || "Unknown"}
                        </p>
                        {l.memberEmail && (
                          <p className="text-xs text-muted-foreground">
                            {l.memberEmail}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            l.status === "repaying"
                              ? "info"
                              : l.status === "approved"
                                ? "warning"
                                : "secondary"
                          }
                          className="capitalize">
                          {l.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatRwf(safeP)}
                      </TableCell>
                      <TableCell className="tabular-nums text-violet-600 dark:text-violet-400">
                        +{formatRwf(interest)}
                      </TableCell>
                      <TableCell className="tabular-nums font-medium">
                        {formatRwf(safeP + interest)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {l.disbursedAt
                          ? format(new Date(l.disbursedAt), "MMM d, yyyy")
                          : "-"}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}

          {!loansPending && activeLoans.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
              <span className="text-muted-foreground">
                {activeLoans.length} active loan
                {activeLoans.length !== 1 ? "s" : ""} outstanding
              </span>
              <div className="flex gap-6 tabular-nums">
                <span className="text-muted-foreground">
                  Total principal:{" "}
                  <span className="font-medium text-foreground">
                    {formatRwf(totalOutstanding)}
                  </span>
                </span>
                <span className="text-muted-foreground">
                  Expected interest:{" "}
                  <span className="font-medium text-violet-600 dark:text-violet-400">
                    {formatRwf(projectedInterestIncome)}
                  </span>
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Member Compliance Risk ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-base font-semibold">
            <Users className="h-4 w-4 text-amber-500" />
            Member Compliance Risk
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Contribution compliance rate per member over the last 6 months —
            sorted lowest to highest.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : memberRisk.length === 0 ? (
            <div className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              No member contribution history available for the last 6 months.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Compliance (6 mo)</TableHead>
                    <TableHead className="text-center">
                      Confirmed / Tracked
                    </TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead className="text-right">
                      Projected 12-mo Contribution
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memberRisk.map((m) => (
                    <TableRow key={m.email || m.name}>
                      <TableCell>
                        <p className="font-medium">{m.name}</p>
                        {m.email && (
                          <p className="text-xs text-muted-foreground">
                            {m.email}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <ComplianceBar rate={m.rate} />
                      </TableCell>
                      <TableCell className="text-center text-sm tabular-nums">
                        {m.confirmed}/{m.total}
                      </TableCell>
                      <TableCell>
                        <RiskBadge rate={m.rate} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {formatRwf(monthlyContributionRwf * 12 * m.rate)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Separator />

              <div className="grid gap-3 p-4 sm:grid-cols-3">
                {(["high", "medium", "low"] as const).map((risk) => {
                  const [label, threshold, upper, color] =
                    risk === "high"
                      ? ["High risk", 0, 0.7, "text-red-600 dark:text-red-400"]
                      : risk === "medium"
                        ? [
                            "Medium risk",
                            0.7,
                            0.9,
                            "text-amber-600 dark:text-amber-400",
                          ]
                        : [
                            "Low risk",
                            0.9,
                            1.1,
                            "text-emerald-600 dark:text-emerald-400",
                          ]

                  const count = memberRisk.filter(
                    (m) => m.rate >= threshold && m.rate < upper
                  ).length

                  return (
                    <div key={risk} className="rounded-md border p-3">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className={`text-2xl font-semibold ${color}`}>
                        {count}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        member{count !== 1 ? "s" : ""}
                      </p>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Scenario Comparison ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-base font-semibold">
            <Target className="h-4 w-4 text-indigo-500" />
            Scenario Comparison
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Side-by-side year-end fund and share-out estimates across all
            scenarios.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              {(["conservative", "realistic", "optimistic"] as Scenario[]).map(
                (sc) => {
                  const rate = scenarioRates[sc]
                  const color = SCENARIO_COLORS[sc]
                  const confirmedToDate = allContributions
                    .filter((c) => c.status === "confirmed")
                    .reduce((sum, c) => {
                      const v = Number.parseFloat(c.amount || "0")
                      return sum + (Number.isNaN(v) ? 0 : v)
                    }, 0)
                  const decIdx = projectionMonths.findIndex((m) => m.isYearEnd)
                  const remaining = decIdx >= 0 ? decIdx + 1 : 12
                  const scFund =
                    confirmedToDate +
                    remaining *
                      membershipCount *
                      monthlyContributionRwf *
                      rate +
                    projectedInterestIncome
                  const scShare = scFund / membershipCount

                  return (
                    <div
                      key={sc}
                      className="rounded-lg border p-4 transition-colors"
                      style={
                        sc === scenario
                          ? {
                              borderColor: color,
                              boxShadow: `0 0 0 2px ${color}40`,
                            }
                          : undefined
                      }>
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-medium capitalize">{sc}</p>
                        <span
                          className="rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{
                            backgroundColor: `${color}20`,
                            color,
                          }}>
                          {formatPct(rate)}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Year-end fund
                          </p>
                          <p className="text-lg font-semibold tabular-nums">
                            {formatRwf(scFund)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Share per member
                          </p>
                          <p
                            className="text-base font-semibold tabular-nums"
                            style={{ color }}>
                            {formatRwf(scShare)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                }
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
