"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { siteConfig } from "@/constants/site-config"
import {
  exportAuditReport,
  type ReportExportFormat,
} from "@/utils/report-export-utils"
import {
  addMonths,
  eachMonthOfInterval,
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
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock,
  Download,
  RefreshCcw,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
  XCircle,
} from "lucide-react"

import { useContributions } from "@/hooks/api/use-contributions"
import { useAdminLoans } from "@/hooks/api/use-loans"
import { useMeetings } from "@/hooks/api/use-meetings"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ExportReportDialog } from "@/components/dashboard/reports/export-report-dialog"

const { monthlyContributionRwf, latePenaltyRate } = siteConfig.platform.savings
const { membershipCount, leadershipTermMonths } = siteConfig.platform.governance
const { interestRate, maxLoanToSavingsRatio } = siteConfig.platform.loans
const { auditCadenceMonths, hostContributionRwf } = siteConfig.platform.meetings

function formatRwf(amount?: string | number | null) {
  if (amount === undefined || amount === null) return "-"
  const value = typeof amount === "number" ? amount : Number.parseFloat(amount)
  if (Number.isNaN(value)) return "-"
  return `${new Intl.NumberFormat("en-RW").format(value)}\u00A0RWF`
}

function formatDate(value?: string | Date | null) {
  if (!value) return "-"
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return format(date, "MMM d, yyyy")
}

function inRange(
  date: string | Date | null | undefined,
  start: Date,
  end: Date
) {
  if (!date) return false
  const d = date instanceof Date ? date : new Date(date)
  return isWithinInterval(d, { start, end })
}

function inMonth(date: string | Date | null | undefined, monthDate: Date) {
  if (!date) return false
  const d = date instanceof Date ? date : new Date(date)
  return isSameMonth(d, monthDate)
}

/** Compute audit period windows from the organisation's first operating month (Mar 2026) */
function getAuditPeriods(anchor: Date = new Date(2026, 2, 1)) {
  const now = new Date()
  const periods: { start: Date; end: Date; label: string; index: number }[] = []
  let idx = 0
  let start = anchor

  while (start <= now) {
    const end = addMonths(start, auditCadenceMonths - 1)
    const endOfPeriod = new Date(end.getFullYear(), end.getMonth() + 1, 0) // last day

    periods.push({
      start: new Date(start.getFullYear(), start.getMonth(), 1),
      end: endOfPeriod,
      label: `${format(start, "MMM yyyy")} – ${format(end, "MMM yyyy")}`,
      index: idx,
    })
    start = addMonths(start, auditCadenceMonths)
    idx++
  }

  return periods
}

function statusCell(status?: string) {
  switch (status) {
    case "confirmed":
      return (
        <Tooltip>
          <TooltipTrigger>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </TooltipTrigger>
          <TooltipContent>Confirmed</TooltipContent>
        </Tooltip>
      )
    case "pending":
      return (
        <Tooltip>
          <TooltipTrigger>
            <Clock className="h-4 w-4 text-amber-500" />
          </TooltipTrigger>
          <TooltipContent>Pending</TooltipContent>
        </Tooltip>
      )
    case "late":
      return (
        <Tooltip>
          <TooltipTrigger>
            <CircleAlert className="h-4 w-4 text-red-500" />
          </TooltipTrigger>
          <TooltipContent>Late</TooltipContent>
        </Tooltip>
      )
    case "waived":
      return (
        <Tooltip>
          <TooltipTrigger>
            <XCircle className="h-4 w-4 text-zinc-400" />
          </TooltipTrigger>
          <TooltipContent>Waived</TooltipContent>
        </Tooltip>
      )
    default:
      return (
        <Tooltip>
          <TooltipTrigger>
            <div className="h-4 w-4 rounded-full border-2 border-dashed border-muted-foreground/30" />
          </TooltipTrigger>
          <TooltipContent>No record</TooltipContent>
        </Tooltip>
      )
  }
}

export function AuditReportView() {
  const auditPeriods = useMemo(() => getAuditPeriods(), [])
  const [periodIdx, setPeriodIdx] = useState(
    Math.max(0, auditPeriods.length - 1)
  )
  const [exportOpen, setExportOpen] = useState(false)

  const currentPeriod = auditPeriods[periodIdx]

  // All contributions - filter client-side by audit range
  const {
    data: contribData,
    isPending: contribPending,
    isRefetching: contribRefetching,
    error: contribError,
    refetch: refetchContribs,
  } = useContributions({ limit: 1000 })

  // All loans - filter client-side
  const {
    loans: allLoans,
    isPending: loansPending,
    isRefetching: loansRefetching,
    error: loansError,
    refetch: refetchLoans,
  } = useAdminLoans()

  // Meetings - filter client-side
  const {
    data: meetingsData,
    isPending: meetingsPending,
    isRefetching: meetingsRefetching,
    error: meetingsError,
    refetch: refetchMeetings,
  } = useMeetings({ limit: 200 })

  const allContributions = useMemo(() => contribData?.data ?? [], [contribData])

  // Months covered by this audit period
  const auditMonths = useMemo(() => {
    if (!currentPeriod) return []
    return eachMonthOfInterval({
      start: currentPeriod.start,
      end: currentPeriod.end,
    })
  }, [currentPeriod])

  // Contributions within audit period
  const periodContributions = useMemo(() => {
    if (!currentPeriod) return []
    return allContributions.filter((c) => {
      if (!c.period) return false
      try {
        const d = parse(c.period, "yyyy-MM", new Date())
        return isWithinInterval(d, {
          start: currentPeriod.start,
          end: currentPeriod.end,
        })
      } catch {
        return false
      }
    })
  }, [allContributions, currentPeriod])

  // Loans within audit period
  const periodLoans = useMemo(() => {
    if (!currentPeriod) return []
    return allLoans.filter(
      (l) =>
        inRange(l.requestedAt, currentPeriod.start, currentPeriod.end) ||
        inRange(l.disbursedAt, currentPeriod.start, currentPeriod.end)
    )
  }, [allLoans, currentPeriod])

  // Meetings within audit period
  const periodMeetings = useMemo(() => {
    if (!currentPeriod) return []
    return (meetingsData?.data ?? []).filter((m) =>
      inRange(m.scheduledAt, currentPeriod.start, currentPeriod.end)
    )
  }, [meetingsData, currentPeriod])

  // Build member × month contribution matrix
  const memberMatrix = useMemo(() => {
    // Collect unique members from contributions
    const memberMap = new Map<
      string,
      { name: string; email: string; contributions: Map<string, string> }
    >()

    for (const c of periodContributions) {
      const memberId = c.memberId || c.memberEmail || c.memberName || "unknown"
      if (!memberMap.has(memberId)) {
        memberMap.set(memberId, {
          name: c.memberName || "Unknown",
          email: c.memberEmail || "",
          contributions: new Map(),
        })
      }
      if (c.period) {
        memberMap.get(memberId)!.contributions.set(c.period, c.status || "")
      }
    }

    return Array.from(memberMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    )
  }, [periodContributions])

  // Financial summary
  const financialSummary = useMemo(() => {
    let totalCollected = 0
    let totalConfirmed = 0
    let totalPenalties = 0
    let confirmedCount = 0
    let lateCount = 0
    let pendingCount = 0
    let penaltyCount = 0

    for (const c of periodContributions) {
      const amount = Number.parseFloat(c.amount || "0")
      const safe = Number.isNaN(amount) ? 0 : amount
      totalCollected += safe
      if (c.status === "confirmed") {
        totalConfirmed += safe
        confirmedCount++
      }
      if (c.status === "late") lateCount++
      if (c.status === "pending") pendingCount++

      // Accumulate penalties regardless of status — a late fee may be recorded
      // on a record that has already been confirmed
      const p = Number.parseFloat(c.penaltyAmount || "0")
      if (!Number.isNaN(p) && p > 0) {
        totalPenalties += p
        penaltyCount++
      }
    }

    const totalExpected =
      membershipCount * monthlyContributionRwf * auditMonths.length
    const totalMonthSlots = membershipCount * auditMonths.length
    const complianceRate =
      totalMonthSlots > 0
        ? Math.round((confirmedCount / totalMonthSlots) * 100)
        : 0

    return {
      totalCollected,
      totalConfirmed,
      totalPenalties,
      confirmedCount,
      lateCount,
      penaltyCount,
      pendingCount,
      totalExpected,
      complianceRate,
      shortfall: Math.max(0, totalExpected - totalConfirmed),
    }
  }, [periodContributions, auditMonths])

  // Loans summary
  const loansSummary = useMemo(() => {
    const disbursed = periodLoans.filter((l) => l.disbursedAt)
    const overdue = periodLoans.filter((l) => l.status === "overdue")
    const repaid = periodLoans.filter((l) => l.status === "repaid")

    const disbursedTotal = disbursed.reduce((sum, l) => {
      const v = Number.parseFloat(l.approvedAmount || l.requestedAmount || "0")
      return sum + (Number.isNaN(v) ? 0 : v)
    }, 0)

    const interestEarned = disbursedTotal * interestRate

    return {
      total: periodLoans.length,
      disbursed: disbursed.length,
      disbursedTotal,
      overdue: overdue.length,
      repaid: repaid.length,
      interestEarned,
    }
  }, [periodLoans])

  const isPending = contribPending || loansPending || meetingsPending
  const isRefetching =
    contribRefetching || loansRefetching || meetingsRefetching
  const isInitialLoading = isPending && allContributions.length === 0

  async function handleRefresh() {
    await Promise.all([refetchContribs(), refetchLoans(), refetchMeetings()])
  }

  async function handleExport(fmt: ReportExportFormat, filename?: string) {
    await exportAuditReport(
      currentPeriod.label,
      financialSummary,
      loansSummary,
      memberMatrix,
      auditMonths,
      periodLoans,
      periodMeetings,
      fmt,
      filename
    )
  }

  const errors = [contribError, loansError, meetingsError].filter(Boolean)

  if (!currentPeriod) return null

  return (
    <div className="flex-1 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Audit Report</h1>
            <p className="text-sm text-muted-foreground">
              {auditCadenceMonths}-month periodic financial review for TrustLink
              Group.
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
        reportTitle="Audit Report"
        defaultFilename={`audit-report-${currentPeriod.label.replace(/\s+/g, "-").toLowerCase()}`}
        onExport={handleExport}
      />

      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            {errors[0]?.help ||
              errors[0]?.message ||
              "Unable to load audit data."}
          </AlertDescription>
        </Alert>
      )}

      {/* Audit Period Navigator */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPeriodIdx((i) => Math.max(0, i - 1))}
                disabled={periodIdx === 0}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-[220px] text-center">
                <p className="text-lg font-semibold">{currentPeriod.label}</p>
                <p className="text-xs text-muted-foreground">
                  Audit period {periodIdx + 1} of {auditPeriods.length} ·{" "}
                  {auditCadenceMonths} months
                </p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setPeriodIdx((i) => Math.min(auditPeriods.length - 1, i + 1))
                }
                disabled={periodIdx === auditPeriods.length - 1}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-violet-500" />
              <span>
                {periodIdx === auditPeriods.length - 1
                  ? "Latest period"
                  : `Period ending ${format(currentPeriod.end, "MMM d, yyyy")}`}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top-level KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Collected
            </CardTitle>
            <Wallet className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {isInitialLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-semibold tabular-nums">
                  {formatRwf(financialSummary.totalCollected)}
                </div>
                <p className="text-xs text-muted-foreground">
                  of {formatRwf(financialSummary.totalExpected)} expected
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Compliance Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            {isInitialLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-semibold tabular-nums">
                  {financialSummary.complianceRate}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {financialSummary.confirmedCount} confirmed of{" "}
                  {membershipCount * auditMonths.length} expected slots
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Penalties Collected
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            {isInitialLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-semibold tabular-nums">
                  {formatRwf(financialSummary.totalPenalties)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {financialSummary.penaltyCount} late payment
                  {financialSummary.penaltyCount !== 1 ? "s" : ""} ·{" "}
                  {(latePenaltyRate * 100).toFixed(0)}% rate
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Loans Disbursed
            </CardTitle>
            <Banknote className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            {loansPending ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-semibold tabular-nums">
                  {formatRwf(loansSummary.disbursedTotal)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {loansSummary.disbursed} loan
                  {loansSummary.disbursed !== 1 ? "s" : ""} ·{" "}
                  {(interestRate * 100).toFixed(0)}% interest
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Member Compliance Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Member Contribution Matrix
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Contribution status per member per month during this audit period.
          </p>
        </CardHeader>
        <CardContent>
          {isInitialLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : memberMatrix.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Users className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No contribution data for this period.
              </p>
            </div>
          ) : (
            <TooltipProvider delayDuration={100}>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[140px]">Member</TableHead>
                      {auditMonths.map((m) => (
                        <TableHead
                          key={m.toISOString()}
                          className="text-center text-xs">
                          {format(m, "MMM yy")}
                        </TableHead>
                      ))}
                      <TableHead className="text-center">Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {memberMatrix.map((member) => {
                      const confirmed = auditMonths.filter(
                        (m) =>
                          member.contributions.get(format(m, "yyyy-MM")) ===
                          "confirmed"
                      ).length

                      return (
                        <TableRow key={member.email || member.name}>
                          <TableCell>
                            <p className="font-medium">{member.name}</p>
                            {member.email && (
                              <p className="text-xs text-muted-foreground">
                                {member.email}
                              </p>
                            )}
                          </TableCell>
                          {auditMonths.map((m) => {
                            const period = format(m, "yyyy-MM")
                            const status = member.contributions.get(period)
                            return (
                              <TableCell key={period} className="text-center">
                                {statusCell(status)}
                              </TableCell>
                            )
                          })}
                          <TableCell className="text-center">
                            <span
                              className={`text-sm font-semibold tabular-nums ${
                                confirmed === auditMonths.length
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : confirmed >= auditMonths.length * 0.75
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-red-600 dark:text-red-400"
                              }`}>
                              {confirmed}/{auditMonths.length}
                            </span>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Matrix Legend */}
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t pt-3 text-xs text-muted-foreground">
                <span className="font-medium">Legend:</span>
                {[
                  {
                    icon: (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ),
                    label: "Confirmed",
                  },
                  {
                    icon: <Clock className="h-3.5 w-3.5 text-amber-500" />,
                    label: "Pending",
                  },
                  {
                    icon: <CircleAlert className="h-3.5 w-3.5 text-red-500" />,
                    label: "Late",
                  },
                  {
                    icon: <XCircle className="h-3.5 w-3.5 text-zinc-400" />,
                    label: "Waived",
                  },
                  {
                    icon: (
                      <div className="h-3.5 w-3.5 rounded-full border-2 border-dashed border-muted-foreground/30" />
                    ),
                    label: "No record",
                  },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-1.5">
                    {item.icon}
                    {item.label}
                  </div>
                ))}
              </div>
            </TooltipProvider>
          )}
        </CardContent>
      </Card>

      {/* Loans Activity */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold">
                Loan Activity
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Loans requested or disbursed during this period.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!loansPending && (
                <>
                  {loansSummary.overdue > 0 && (
                    <Badge variant="danger">
                      {loansSummary.overdue} overdue
                    </Badge>
                  )}
                  {loansSummary.repaid > 0 && (
                    <Badge variant="success">
                      {loansSummary.repaid} repaid
                    </Badge>
                  )}
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loansPending ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : periodLoans.length === 0 ? (
            <div className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
              <Banknote className="h-4 w-4" />
              No loan activity during this period.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Approved</TableHead>
                  <TableHead>Interest</TableHead>
                  <TableHead>Requested Date</TableHead>
                  <TableHead>Disbursed Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periodLoans.map((l) => {
                  const approved = Number.parseFloat(
                    l.approvedAmount || l.requestedAmount || "0"
                  )
                  const interest = Number.isNaN(approved)
                    ? 0
                    : approved * interestRate
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
                            l.status === "repaid"
                              ? "success"
                              : l.status === "overdue"
                                ? "danger"
                                : l.status === "disbursed" ||
                                    l.status === "repaying"
                                  ? "info"
                                  : l.status === "approved"
                                    ? "warning"
                                    : "outline"
                          }
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
                      <TableCell className="tabular-nums text-sm">
                        {formatRwf(interest)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(l.requestedAt)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(l.disbursedAt)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Meetings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Meetings ({periodMeetings.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {meetingsPending ? (
            <div className="p-6">
              <Skeleton className="h-10 w-full" />
            </div>
          ) : periodMeetings.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No meetings during this audit period.
            </p>
          ) : (
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
                {periodMeetings.map((m) => (
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
          )}
        </CardContent>
      </Card>

      {/* Full Audit Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Audit Summary - {currentPeriod.label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isInitialLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">
                    Expected contributions
                  </p>
                  <p className="text-lg font-semibold tabular-nums">
                    {formatRwf(financialSummary.totalExpected)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {membershipCount} members × {auditMonths.length} months ×{" "}
                    {formatRwf(monthlyContributionRwf)}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">
                    Confirmed savings
                  </p>
                  <p className="text-lg font-semibold tabular-nums">
                    {formatRwf(financialSummary.totalConfirmed)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {financialSummary.complianceRate}% compliance rate
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Shortfall</p>
                  <p className="text-lg font-semibold tabular-nums text-red-600 dark:text-red-400">
                    {formatRwf(financialSummary.shortfall)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Unconfirmed expected amount
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">
                    Penalties collected
                  </p>
                  <p className="text-lg font-semibold tabular-nums">
                    {formatRwf(financialSummary.totalPenalties)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {financialSummary.penaltyCount} with penalty ·{" "}
                    {financialSummary.pendingCount} pending
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">
                    Loan disbursements
                  </p>
                  <p className="text-lg font-semibold tabular-nums">
                    {formatRwf(loansSummary.disbursedTotal)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Est. interest earned:{" "}
                    {formatRwf(loansSummary.interestEarned)}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Meetings held</p>
                  <p className="text-lg font-semibold">
                    {
                      periodMeetings.filter((m) => m.status === "completed")
                        .length
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">
                    of {periodMeetings.length} scheduled · host fee:{" "}
                    {formatRwf(hostContributionRwf)}
                  </p>
                </div>
              </div>

              <Separator className="my-4" />

              {/* Compliance Indicators */}
              <div className="space-y-3">
                <p className="text-sm font-medium">Compliance Indicators</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    {
                      label: "Contribution compliance",
                      ok: financialSummary.complianceRate >= 80,
                      value: `${financialSummary.complianceRate}%`,
                      threshold: "≥ 80%",
                    },
                    {
                      label: "Late payments",
                      ok: financialSummary.penaltyCount === 0,
                      value: String(financialSummary.penaltyCount),
                      threshold: "Target: 0",
                    },
                    {
                      label: "Overdue loans",
                      ok: loansSummary.overdue === 0,
                      value: String(loansSummary.overdue),
                      threshold: "Target: 0",
                    },
                    {
                      label: "Members covered",
                      ok: memberMatrix.length >= membershipCount,
                      value: `${memberMatrix.length}/${membershipCount}`,
                      threshold: `Target: ${membershipCount}`,
                    },
                    {
                      label: "Meetings held",
                      ok:
                        periodMeetings.filter((m) => m.status === "completed")
                          .length >= 1,
                      value: String(
                        periodMeetings.filter((m) => m.status === "completed")
                          .length
                      ),
                      threshold: "≥ 1 per period",
                    },
                    {
                      label: "Loan-to-savings ratio",
                      ok: true,
                      value: `${(maxLoanToSavingsRatio * 100).toFixed(0)}% max`,
                      threshold: "Policy limit",
                    },
                  ].map((indicator) => (
                    <div
                      key={indicator.label}
                      className={`flex items-center justify-between rounded-md border p-3 ${
                        indicator.ok
                          ? "border-emerald-500/20 bg-emerald-500/5"
                          : "border-red-500/20 bg-red-500/5"
                      }`}>
                      <div>
                        <p className="text-xs font-medium">{indicator.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {indicator.threshold}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {indicator.ok ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <CircleAlert className="h-4 w-4 text-red-500" />
                        )}
                        <span
                          className={`text-sm font-semibold ${
                            indicator.ok
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                          }`}>
                          {indicator.value}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
