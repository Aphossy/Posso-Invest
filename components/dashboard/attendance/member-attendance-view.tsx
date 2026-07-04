"use client"

import { useMemo, useState } from "react"
import {
  CalendarCheck,
  CalendarX,
  CheckCircle2,
  Clock,
  MessageSquare,
  RefreshCcw,
  Search,
  TrendingUp,
  UserCheck,
  type LucideIcon,
} from "lucide-react"

import { ApiErrorException } from "@/types/api"
import { cn } from "@/lib/utils"
import {
  useAttendance,
  type AttendanceRecord,
} from "@/hooks/api/use-attendance"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

// ─── constants ───────────────────────────────────────────────────────────────

type StatusFilter = "all" | "present" | "late" | "excused" | "absent"

const statusMeta: Record<
  AttendanceRecord["status"],
  {
    label: string
    rail: string
    badge: string
    icon: LucideIcon
    iconClass: string
  }
> = {
  present: {
    label: "Present",
    rail: "bg-emerald-500",
    badge: "bg-emerald-100 text-emerald-700",
    icon: CheckCircle2,
    iconClass: "text-emerald-500",
  },
  late: {
    label: "Late",
    rail: "bg-blue-400",
    badge: "bg-blue-100 text-blue-700",
    icon: Clock,
    iconClass: "text-blue-500",
  },
  excused: {
    label: "Excused",
    rail: "bg-amber-400",
    badge: "bg-amber-100 text-amber-700",
    icon: CalendarCheck,
    iconClass: "text-amber-500",
  },
  absent: {
    label: "Absent",
    rail: "bg-rose-500",
    badge: "bg-rose-100 text-rose-700",
    icon: CalendarX,
    iconClass: "text-rose-500",
  },
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function toDate(v?: string | Date | null): Date | null {
  if (!v) return null
  const d = v instanceof Date ? v : new Date(v)
  return isNaN(d.getTime()) ? null : d
}

function formatDate(v?: string | Date | null) {
  const d = toDate(v)
  if (!d) return null
  return d.toLocaleDateString("en-RW", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function formatTime(v?: string | Date | null) {
  const d = toDate(v)
  if (!d) return null
  return d.toLocaleTimeString("en-RW", { hour: "2-digit", minute: "2-digit" })
}

function monthKey(v?: string | Date | null): string {
  const d = toDate(v)
  if (!d) return "Unknown"
  return d.toLocaleDateString("en-RW", { month: "long", year: "numeric" })
}

function monthSortKey(v?: string | Date | null): number {
  const d = toDate(v)
  if (!d) return 0
  return d.getFullYear() * 100 + d.getMonth()
}

// ─── sub-components ──────────────────────────────────────────────────────────

function AttendanceCard({ record }: { record: AttendanceRecord }) {
  const meta = statusMeta[record.status]
  const Icon = meta.icon
  const dateVal = record.checkedInAt ?? record.createdAt
  const dateLabel = formatDate(dateVal)
  const timeLabel = record.checkedInAt ? formatTime(record.checkedInAt) : null

  return (
    <div className="flex gap-3 rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md">
      {/* status rail */}
      <div
        className={cn("w-1 shrink-0 self-stretch rounded-l-xl", meta.rail)}
      />

      <div className="flex flex-1 flex-col gap-1.5 py-3 pr-4">
        {/* row 1: meeting + badge */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-sm font-semibold leading-snug">
            {record.meetingTitle ?? "Meeting"}
          </p>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
              meta.badge
            )}>
            <Icon className="h-3 w-3" />
            {meta.label}
          </span>
        </div>

        {/* row 2: date + time */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {dateLabel && (
            <span className="flex items-center gap-1">
              <CalendarCheck className="h-3 w-3" />
              {dateLabel}
            </span>
          )}
          {timeLabel && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Checked in at {timeLabel}
            </span>
          )}
        </div>

        {/* row 3: recorded by + notes */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {record.recordedByName && (
            <span className="flex items-center gap-1">
              <UserCheck className="h-3 w-3" />
              Recorded by {record.recordedByName}
            </span>
          )}
          {record.notes && (
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {record.notes}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function MonthSection({
  month,
  records,
}: {
  month: string
  records: AttendanceRecord[]
}) {
  const presentOrLate = records.filter(
    (r) => r.status === "present" || r.status === "late"
  ).length

  return (
    <div className="space-y-3">
      {/* month header */}
      <div className="flex items-center gap-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {month}
        </h2>
        <div className="h-px flex-1 bg-border" />
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {presentOrLate}/{records.length} attended
        </span>
      </div>

      {/* cards with timeline line */}
      <div className="relative space-y-2 pl-4">
        <div className="absolute left-0 top-2 h-[calc(100%-8px)] w-px bg-border" />
        {records.map((record) => (
          <AttendanceCard key={record.id} record={record} />
        ))}
      </div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed p-12 text-center">
      <CalendarCheck className="mx-auto mb-3 h-9 w-9 text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

// ─── stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  iconClass,
  isLoading,
}: {
  label: string
  value: number
  sub: string
  icon: LucideIcon
  iconClass: string
  isLoading: boolean
}) {
  return (
    <Card className="rounded-xl">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{label}</span>
          <Icon className={cn("h-4 w-4", iconClass)} />
        </div>
        {isLoading ? (
          <Skeleton className="mt-2 h-8 w-16" />
        ) : (
          <div className="mt-2 text-2xl font-semibold tabular-nums">
            {value}
          </div>
        )}
        <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  )
}

// ─── main view ────────────────────────────────────────────────────────────────

export function MemberAttendanceView() {
  const { data, isPending, isRefetching, error, refetch } = useAttendance({
    limit: 200,
  })
  const [filterTab, setFilterTab] = useState<StatusFilter>("all")
  const [search, setSearch] = useState("")

  const records = data?.data ?? []
  const isLoading = isPending && records.length === 0

  const summary = useMemo(() => {
    const present = records.filter((r) => r.status === "present").length
    const absent = records.filter((r) => r.status === "absent").length
    const late = records.filter((r) => r.status === "late").length
    const excused = records.filter((r) => r.status === "excused").length
    const total = records.length
    // attendance rate: present + late count as "attended"
    const attendedCount = present + late
    const rate = total > 0 ? Math.round((attendedCount / total) * 100) : 0
    return { present, absent, late, excused, total, rate, attendedCount }
  }, [records])

  const visibleRecords = useMemo(() => {
    let items = records
    if (filterTab !== "all") items = items.filter((r) => r.status === filterTab)
    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter(
        (r) =>
          (r.meetingTitle ?? "").toLowerCase().includes(q) ||
          (r.notes ?? "").toLowerCase().includes(q) ||
          (r.recordedByName ?? "").toLowerCase().includes(q)
      )
    }
    // sort newest first
    return [...items].sort((a, b) => {
      const da = toDate(a.checkedInAt ?? a.createdAt)?.getTime() ?? 0
      const db = toDate(b.checkedInAt ?? b.createdAt)?.getTime() ?? 0
      return db - da
    })
  }, [records, filterTab, search])

  // group by month
  const monthGroups = useMemo(() => {
    const map = new Map<
      string,
      { sortKey: number; records: AttendanceRecord[] }
    >()
    visibleRecords.forEach((r) => {
      const key = monthKey(r.checkedInAt ?? r.createdAt)
      const sk = monthSortKey(r.checkedInAt ?? r.createdAt)
      if (!map.has(key)) map.set(key, { sortKey: sk, records: [] })
      map.get(key)!.records.push(r)
    })
    return [...map.entries()]
      .sort(([, a], [, b]) => b.sortKey - a.sortKey)
      .map(([month, { records }]) => ({ month, records }))
  }, [visibleRecords])

  return (
    <div className="flex-1 space-y-6">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">My Attendance</h1>
          <p className="text-sm text-muted-foreground">
            Your participation record across all Ikimina meetings.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          disabled={isRefetching}>
          <RefreshCcw className="h-4 w-4" />
          {isRefetching ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error instanceof ApiErrorException
              ? error.help || error.message
              : "Failed to load attendance records"}
          </AlertDescription>
        </Alert>
      )}

      {/* stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Present"
          value={summary.present}
          sub="Meetings attended on time"
          icon={CheckCircle2}
          iconClass="text-emerald-500"
          isLoading={isLoading}
        />
        <StatCard
          label="Late"
          value={summary.late}
          sub="Arrived after start time"
          icon={Clock}
          iconClass="text-blue-500"
          isLoading={isLoading}
        />
        <StatCard
          label="Excused"
          value={summary.excused}
          sub="Absences with notice"
          icon={CalendarCheck}
          iconClass="text-amber-500"
          isLoading={isLoading}
        />
        <StatCard
          label="Absent"
          value={summary.absent}
          sub="Unexcused absences"
          icon={CalendarX}
          iconClass="text-rose-500"
          isLoading={isLoading}
        />
      </div>

      {/* attendance rate card */}
      {!isLoading && summary.total > 0 && (
        <Card className="rounded-xl">
          <CardContent className="space-y-3 pt-5">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1.5 font-medium">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                Attendance Rate
              </div>
              <span className="tabular-nums text-muted-foreground">
                {summary.attendedCount} / {summary.total} meetings &mdash;{" "}
                {summary.rate}%
              </span>
            </div>
            <Progress value={summary.rate} className="h-2" />

            <div className="flex flex-wrap gap-2 pt-0.5">
              {summary.rate >= 80 ? (
                <div className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  Great attendance - you&apos;re meeting the 80% threshold.
                </div>
              ) : (
                <div className="flex items-center gap-1.5 rounded-md bg-amber-50 px-3 py-1.5 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                  <CalendarX className="h-3.5 w-3.5 shrink-0" />
                  Your attendance is below 80% - try to attend more meetings.
                </div>
              )}
              {summary.absent > 0 && (
                <div className="flex items-center gap-1.5 rounded-md bg-rose-50 px-3 py-1.5 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-400">
                  <CalendarX className="h-3.5 w-3.5 shrink-0" />
                  <strong>{summary.absent}</strong> unexcused absence
                  {summary.absent !== 1 ? "s" : ""} on record.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* filter bar */}
      {!isLoading && summary.total > 0 && (
        <div className="flex flex-wrap  items-center gap-3">
          <Tabs
            value={filterTab}
            onValueChange={(v) => setFilterTab(v as StatusFilter)}
            className="overflow-x-auto">
            <TabsList className="h-8">
              <TabsTrigger value="all" className="px-3 text-xs">
                All ({summary.total})
              </TabsTrigger>
              <TabsTrigger value="present" className="px-3 text-xs">
                Present ({summary.present})
              </TabsTrigger>
              <TabsTrigger value="late" className="px-3 text-xs">
                Late ({summary.late})
              </TabsTrigger>
              <TabsTrigger value="excused" className="px-3 text-xs">
                Excused ({summary.excused})
              </TabsTrigger>
              <TabsTrigger value="absent" className="px-3 text-xs">
                Absent ({summary.absent})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative min-w-52 flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search meetings, notes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-9 text-sm"
            />
          </div>
        </div>
      )}

      {/* loading skeletons */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((n) => (
            <Skeleton key={n} className="h-20 rounded-xl" />
          ))}
        </div>
      )}

      {/* monthly timeline */}
      {!isLoading && (
        <div className="space-y-8">
          {monthGroups.map(({ month, records: monthRecords }) => (
            <MonthSection key={month} month={month} records={monthRecords} />
          ))}

          {visibleRecords.length === 0 && (
            <EmptyState
              message={
                search
                  ? "No records match your search."
                  : filterTab !== "all"
                    ? "No records with this status."
                    : "No attendance records found. They will appear here once meetings are recorded."
              }
            />
          )}
        </div>
      )}
    </div>
  )
}
