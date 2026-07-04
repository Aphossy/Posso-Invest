"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { siteConfig } from "@/constants/site-config"
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  getDaysInMonth,
  isSameDay,
  isWithinInterval,
  parse,
  startOfMonth,
  subMonths,
} from "date-fns"
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleDollarSign,
  Clock,
  Eye,
  Flame,
  RefreshCcw,
  TrendingUp,
  Wallet,
} from "lucide-react"

import { getActivePeriod } from "@/lib/contribution-window"
import { useMyContributions } from "@/hooks/api/use-contributions"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Loader } from "@/components/common/loader"

const { monthlyContributionRwf, contributionWindow } =
  siteConfig.platform.savings

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
  return date.toLocaleDateString("en-RW", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function statusVariant(status?: string) {
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

function statusColor(status?: string) {
  switch (status) {
    case "confirmed":
      return "bg-emerald-500"
    case "pending":
      return "bg-amber-400"
    case "late":
      return "bg-red-500"
    case "waived":
      return "bg-zinc-400"
    default:
      return "bg-muted"
  }
}

function statusBgLight(status?: string) {
  switch (status) {
    case "confirmed":
      return "bg-emerald-500/15 dark:bg-emerald-500/20"
    case "pending":
      return "bg-amber-400/15 dark:bg-amber-400/20"
    case "late":
      return "bg-red-500/15 dark:bg-red-500/20"
    case "waived":
      return "bg-zinc-400/15 dark:bg-zinc-400/20"
    default:
      return "bg-muted/50"
  }
}

function statusIcon(status?: string) {
  switch (status) {
    case "confirmed":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    case "pending":
      return <Clock className="h-4 w-4 text-amber-500" />
    case "late":
      return <CircleAlert className="h-4 w-4 text-red-500" />
    case "waived":
      return <CircleDollarSign className="h-4 w-4 text-zinc-400" />
    default:
      return null
  }
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

const MONTH_FULL_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

interface ContributionData {
  id: string
  period: string
  amount: string
  status: string
  paidAt?: string | Date | null
  penaltyAmount?: string | null
  receiptNumber?: string | null
  notes?: string | null
  dueDate?: string | Date | null
  createdAt?: string | Date | null
  metadata?: {
    paymentMethod?: string
    attachments?: Array<{ name: string; url: string }>
  } | null
}

function getContributionWindow(year: number, month: number) {
  const startDay = contributionWindow.startDay
  const endDay = contributionWindow.endDay

  const prevMonth = month === 0 ? 11 : month - 1
  const prevYear = month === 0 ? year - 1 : year

  const windowStart = new Date(prevYear, prevMonth, startDay)
  const windowEnd = new Date(year, month, endDay)

  return { windowStart, windowEnd }
}

function getContributionStreak(
  contributions: ContributionData[],
  currentYear: number
) {
  const sorted = [...contributions]
    .filter((c) => c.status === "confirmed")
    .sort((a, b) => b.period.localeCompare(a.period))

  let streak = 0
  const now = new Date()
  let checkDate = new Date(now.getFullYear(), now.getMonth(), 1)

  for (let i = 0; i < 24; i++) {
    const period = format(checkDate, "yyyy-MM")
    const found = sorted.find((c) => c.period === period)
    if (found) {
      streak++
      checkDate = subMonths(checkDate, 1)
    } else {
      break
    }
  }

  return streak
}

function getCompletionRate(contributions: ContributionData[], year: number) {
  const yearContributions = contributions.filter((c) =>
    c.period.startsWith(String(year))
  )
  const now = new Date()
  const currentMonth = year === now.getFullYear() ? now.getMonth() + 1 : 12
  const confirmed = yearContributions.filter(
    (c) => c.status === "confirmed"
  ).length

  return currentMonth > 0 ? Math.round((confirmed / currentMonth) * 100) : 0
}

export function ContributionCalendarView() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [expandedMonth, setExpandedMonth] = useState<number | null>(
    new Date().getMonth()
  )
  const [selectedContribution, setSelectedContribution] =
    useState<ContributionData | null>(null)

  const { data, isPending, error, refetch, isRefetching } =
    useMyContributions(200)

  const contributions = useMemo(() => data?.data ?? [], [data?.data])

  const contributionsByPeriod = useMemo(() => {
    const map = new Map<string, ContributionData>()
    for (const c of contributions) {
      if (c.period) {
        map.set(c.period, c as ContributionData)
      }
    }
    return map
  }, [contributions])

  const yearContributions = useMemo(
    () =>
      contributions.filter((c) => c.period?.startsWith(String(selectedYear))),
    [contributions, selectedYear]
  )

  const totalPaidThisYear = useMemo(
    () =>
      yearContributions.reduce((sum, c) => {
        const v = Number.parseFloat(c.amount || "0")
        return Number.isNaN(v) ? sum : sum + v
      }, 0),
    [yearContributions]
  )

  const confirmedThisYear = yearContributions.filter(
    (c) => c.status === "confirmed"
  ).length
  const pendingThisYear = yearContributions.filter(
    (c) => c.status === "pending"
  ).length
  const lateThisYear = yearContributions.filter(
    (c) => c.status === "late"
  ).length

  const streak = useMemo(
    () =>
      getContributionStreak(contributions as ContributionData[], selectedYear),
    [contributions, selectedYear]
  )
  const completionRate = useMemo(
    () => getCompletionRate(contributions as ContributionData[], selectedYear),
    [contributions, selectedYear]
  )

  const today = new Date()
  const currentPeriod = getActivePeriod()

  const isCurrentWindow = useMemo(() => {
    const { windowStart, windowEnd } = getContributionWindow(
      today.getFullYear(),
      today.getMonth()
    )
    return isWithinInterval(today, { start: windowStart, end: windowEnd })
  }, [])

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Contributions Calendar</h1>
            <p className="text-sm text-muted-foreground">
              Track your monthly savings at a glance.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => void refetch()}
          disabled={isRefetching}>
          <RefreshCcw className="h-4 w-4" />
          {isRefetching ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>
            {error.help || error.message || "Unable to load contributions."}
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Year Total</CardTitle>
            <Wallet className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {isPending ? (
                <Loader className="h-5 w-5" />
              ) : (
                formatRwf(totalPaidThisYear)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {confirmedThisYear} of 12 months confirmed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Completion Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-sky-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {isPending ? (
                <Loader className="h-5 w-5" />
              ) : (
                `${completionRate}%`
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Based on elapsed months in {selectedYear}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Current Streak
            </CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {isPending ? (
                <Loader className="h-5 w-5" />
              ) : (
                `${streak} month${streak !== 1 ? "s" : ""}`
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Consecutive confirmed payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Contribution Window
            </CardTitle>
            <CalendarDays className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {contributionWindow.startDay}th – {contributionWindow.endDay}th
            </div>
            <p className="text-xs text-muted-foreground">
              {isCurrentWindow ? (
                <span className="text-emerald-600 dark:text-emerald-400">
                  Window is currently open
                </span>
              ) : (
                "Window is currently closed"
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Year Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedYear((y) => y - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="min-w-[80px] text-center text-lg font-semibold tabular-nums">
            {selectedYear}
          </h2>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedYear((y) => y + 1)}
            disabled={selectedYear >= new Date().getFullYear()}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {selectedYear !== new Date().getFullYear() && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedYear(new Date().getFullYear())}>
            Back to {new Date().getFullYear()}
          </Button>
        )}
      </div>

      {/* Yearly Grid */}
      {isPending ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <Loader className="h-6 w-6" />
              <p className="text-sm text-muted-foreground">
                Loading calendar...
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            <TooltipProvider delayDuration={200}>
              {Array.from({ length: 12 }, (_, monthIndex) => {
                const period = `${selectedYear}-${String(monthIndex + 1).padStart(2, "0")}`
                const contribution = contributionsByPeriod.get(period)
                const isCurrent = period === currentPeriod
                const isFuture = new Date(selectedYear, monthIndex) > new Date()
                const isExpanded = expandedMonth === monthIndex

                return (
                  <MonthCard
                    key={period}
                    period={period}
                    monthIndex={monthIndex}
                    year={selectedYear}
                    contribution={contribution as ContributionData | undefined}
                    isCurrent={isCurrent}
                    isFuture={isFuture}
                    isExpanded={isExpanded}
                    onToggleExpand={() =>
                      setExpandedMonth(isExpanded ? null : monthIndex)
                    }
                    onViewDetails={(c) => setSelectedContribution(c)}
                  />
                )
              })}
            </TooltipProvider>
          </div>

          {/* Legend */}
          <Card>
            <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2 p-4">
              <span className="text-xs font-medium text-muted-foreground">
                Legend:
              </span>
              {[
                { status: "confirmed", label: "Confirmed" },
                { status: "pending", label: "Pending" },
                { status: "late", label: "Late" },
                { status: "waived", label: "Waived" },
                { status: undefined, label: "No record" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <div
                    className={`h-3 w-3 rounded-sm ${statusColor(item.status)}`}
                  />
                  <span className="text-xs text-muted-foreground">
                    {item.label}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Year Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                {selectedYear} Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Expected</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {formatRwf(monthlyContributionRwf * 12)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    12 months × {formatRwf(monthlyContributionRwf)}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Paid</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {formatRwf(totalPaidThisYear)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {confirmedThisYear + pendingThisYear + lateThisYear} payment
                    {confirmedThisYear + pendingThisYear + lateThisYear !== 1
                      ? "s"
                      : ""}{" "}
                    recorded
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Remaining</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {formatRwf(
                      Math.max(
                        0,
                        monthlyContributionRwf * 12 - totalPaidThisYear
                      )
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {Math.max(0, 12 - confirmedThisYear)} month
                    {Math.max(0, 12 - confirmedThisYear) !== 1 ? "s" : ""} left
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Penalties</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {formatRwf(
                      yearContributions.reduce((sum, c) => {
                        const v = Number.parseFloat(c.penaltyAmount || "0")
                        return Number.isNaN(v) ? sum : sum + v
                      }, 0)
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {lateThisYear} late payment
                    {lateThisYear !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Contribution Details Sheet */}
      <Sheet
        open={Boolean(selectedContribution)}
        onOpenChange={(open) => !open && setSelectedContribution(null)}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Contribution Details</SheetTitle>
            <SheetDescription>
              {selectedContribution?.period
                ? `Details for ${format(parse(selectedContribution.period, "yyyy-MM", new Date()), "MMMM yyyy")}`
                : "Review this contribution record."}
            </SheetDescription>
          </SheetHeader>

          {selectedContribution ? (
            <div className="space-y-4 p-4 pt-0">
              <div
                className={`rounded-md border p-4 ${statusBgLight(selectedContribution.status)}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Amount</p>
                    <p className="text-xl font-semibold tabular-nums">
                      {formatRwf(selectedContribution.amount)}
                    </p>
                  </div>
                  <Badge variant={statusVariant(selectedContribution.status)}>
                    {selectedContribution.status}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Period</p>
                  <p className="text-sm font-medium">
                    {selectedContribution.period
                      ? format(
                          parse(
                            selectedContribution.period,
                            "yyyy-MM",
                            new Date()
                          ),
                          "MMMM yyyy"
                        )
                      : "-"}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Paid Date</p>
                  <p className="text-sm font-medium">
                    {formatDate(selectedContribution.paidAt)}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Receipt</p>
                  <p className="text-sm font-medium">
                    {selectedContribution.receiptNumber || "-"}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Penalty</p>
                  <p className="text-sm font-medium">
                    {formatRwf(selectedContribution.penaltyAmount)}
                  </p>
                </div>
              </div>

              {selectedContribution.metadata?.paymentMethod && (
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">
                    Payment Method
                  </p>
                  <p className="text-sm font-medium capitalize">
                    {selectedContribution.metadata.paymentMethod === "momo"
                      ? "Mobile Money"
                      : selectedContribution.metadata.paymentMethod}
                  </p>
                </div>
              )}

              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Notes</p>
                <p className="text-sm">
                  {selectedContribution.notes?.trim() || "No notes provided."}
                </p>
              </div>

              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Recorded</p>
                <p className="text-sm font-medium">
                  {formatDate(selectedContribution.createdAt)}
                </p>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function MonthCard({
  period,
  monthIndex,
  year,
  contribution,
  isCurrent,
  isFuture,
  isExpanded,
  onToggleExpand,
  onViewDetails,
}: {
  period: string
  monthIndex: number
  year: number
  contribution?: ContributionData
  isCurrent: boolean
  isFuture: boolean
  isExpanded: boolean
  onToggleExpand: () => void
  onViewDetails: (c: ContributionData) => void
}) {
  const status = contribution?.status
  const { windowStart, windowEnd } = getContributionWindow(year, monthIndex)
  const monthDate = new Date(year, monthIndex, 1)
  const daysInMonth = getDaysInMonth(monthDate)
  const firstDayOfWeek = getDay(monthDate)

  return (
    <Card
      className={`group cursor-pointer transition-all hover:shadow-md ${
        isCurrent ? "ring-2 ring-primary/30" : ""
      } ${isFuture && !contribution ? "opacity-50" : ""}`}
      onClick={onToggleExpand}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 p-3 pb-1">
        <div className="flex items-center gap-2">
          <div className={`h-2.5 w-2.5 rounded-full ${statusColor(status)}`} />
          <CardTitle className="text-sm font-medium">
            {MONTH_FULL_NAMES[monthIndex]}
          </CardTitle>
        </div>
        <div className="flex items-center gap-1.5">
          {isCurrent && (
            <Badge variant="info" className="text-[10px] px-1.5 py-0">
              Now
            </Badge>
          )}
          {statusIcon(status)}
        </div>
      </CardHeader>

      <CardContent className="p-3 pt-0">
        {contribution ? (
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <p className="text-lg font-semibold tabular-nums">
                {formatRwf(contribution.amount)}
              </p>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {contribution.paidAt
                  ? `Paid ${formatDate(contribution.paidAt)}`
                  : "Not yet paid"}
              </span>
            </div>
            {contribution.penaltyAmount &&
              Number.parseFloat(contribution.penaltyAmount) > 0 && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  +{formatRwf(contribution.penaltyAmount)} penalty
                </p>
              )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-lg font-semibold tabular-nums text-muted-foreground/50">
              {formatRwf(monthlyContributionRwf)}
            </p>
            <p className="text-xs text-muted-foreground">
              {isFuture ? "Upcoming" : "No record"}
            </p>
          </div>
        )}

        {/* Mini calendar grid */}
        {isExpanded && (
          <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
            <Separator />
            <div className="grid grid-cols-7 gap-px text-center">
              {DAY_NAMES.map((d) => (
                <div
                  key={d}
                  className="text-[9px] font-medium text-muted-foreground">
                  {d.charAt(0)}
                </div>
              ))}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1
                const dayDate = new Date(year, monthIndex, day)
                const isInWindow = isWithinInterval(dayDate, {
                  start: windowStart,
                  end: windowEnd,
                })
                const isToday = isSameDay(dayDate, new Date())
                const isPaidDay =
                  contribution?.paidAt &&
                  isSameDay(dayDate, new Date(contribution.paidAt as string))
                const isDueDay =
                  day === contributionWindow.endDay && monthIndex >= 0

                return (
                  <Tooltip key={day}>
                    <TooltipTrigger asChild>
                      <div
                        className={`relative flex h-6 w-full items-center justify-center rounded-sm text-[10px] tabular-nums transition-colors ${
                          isToday
                            ? "bg-primary text-primary-foreground font-bold"
                            : isPaidDay
                              ? "bg-emerald-500 text-white font-bold"
                              : isInWindow
                                ? "bg-primary/10 dark:bg-primary/15"
                                : ""
                        } ${isDueDay && !isToday && !isPaidDay ? "ring-1 ring-amber-400" : ""}`}>
                        {day}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p>
                        {format(dayDate, "MMM d, yyyy")}
                        {isToday && " (Today)"}
                        {isPaidDay && " - Payment date"}
                        {isInWindow &&
                          !isPaidDay &&
                          !isToday &&
                          " - Payment window"}
                        {isDueDay && " - Due date"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>

            <div className="flex flex-wrap gap-1.5 text-[9px] text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-sm bg-primary/10" />
                Window
              </div>
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-sm bg-primary" />
                Today
              </div>
              {contribution?.paidAt && (
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-sm bg-emerald-500" />
                  Paid
                </div>
              )}
            </div>

            {contribution && (
              <Button
                variant="outline"
                size="sm"
                className="mt-1 w-full"
                onClick={(e) => {
                  e.stopPropagation()
                  onViewDetails(contribution)
                }}>
                <Eye className="mr-1 h-3 w-3" />
                View details
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
