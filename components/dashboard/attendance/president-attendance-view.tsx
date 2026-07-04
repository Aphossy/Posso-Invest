"use client"

import { useMemo, useState } from "react"
import type { AttendanceExportable } from "@/utils/attendance-export-utils"
import {
  AlertTriangle,
  CalendarCheck,
  ChevronDown,
  Clock3,
  Download,
  RefreshCcw,
  Search,
  ShieldCheck,
  ShieldX,
  Sparkles,
  UserCheck,
  UserMinus,
  Users,
} from "lucide-react"

import { ApiErrorException } from "@/types/api"
import { cn } from "@/lib/utils"
import { useAttendance } from "@/hooks/api/use-attendance"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { ExportAttendanceDialog } from "@/components/dashboard/attendance/export-attendance-dialog"

const QUORUM_FRACTION = 2 / 3

function quorumMet(present: number, late: number, total: number): boolean {
  return total > 0 && present + late >= Math.ceil(total * QUORUM_FRACTION)
}

function getStatusBadge(status: string) {
  switch (status) {
    case "present":
      return (
        <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300">
          Present
        </Badge>
      )
    case "late":
      return (
        <Badge className="bg-sky-100 text-sky-800 border border-sky-300">
          Late
        </Badge>
      )
    case "excused":
      return (
        <Badge className="bg-violet-100 text-violet-800 border border-violet-300">
          Excused
        </Badge>
      )
    case "absent":
      return (
        <Badge className="bg-amber-100 text-amber-800 border border-amber-300">
          Absent
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export function PresidentAttendanceView() {
  const { data, isPending, isRefetching, error, refetch } = useAttendance({
    limit: 200,
  })

  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<
    "all" | "present" | "absent" | "late" | "excused"
  >("all")
  const [quorumFilter, setQuorumFilter] = useState<"all" | "met" | "not_met">(
    "all"
  )
  const [expandedMeetingId, setExpandedMeetingId] = useState<string>("")
  const [exportDialogOpen, setExportDialogOpen] = useState(false)

  const records = (data?.data as AttendanceExportable[]) ?? []
  const isLoading = isPending && records.length === 0

  const summary = useMemo(() => {
    const presentCount = records.filter((r) => r.status === "present").length
    const absentCount = records.filter((r) => r.status === "absent").length
    const lateCount = records.filter((r) => r.status === "late").length
    const excusedCount = records.filter((r) => r.status === "excused").length
    return {
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
      total: records.length,
    }
  }, [records])

  const uniqueMeetings = useMemo(
    () => new Set(records.map((r) => r.meetingId)).size,
    [records]
  )

  const overallRate =
    summary.total === 0
      ? 0
      : Math.round(
          ((summary.presentCount + summary.lateCount) / summary.total) * 100
        )

  const groupedMeetings = useMemo(() => {
    const map = new Map<
      string,
      {
        meetingId: string
        meetingTitle: string
        records: AttendanceExportable[]
        latestActivity: number
        presentCount: number
        absentCount: number
        lateCount: number
        excusedCount: number
      }
    >()

    records.forEach((record) => {
      const key = record.meetingId || "unknown"
      const existing = map.get(key)
      const t = new Date(record.checkedInAt || record.createdAt).getTime()

      if (!existing) {
        map.set(key, {
          meetingId: key,
          meetingTitle: record.meetingTitle || "Meeting",
          records: [record],
          latestActivity: t,
          presentCount: record.status === "present" ? 1 : 0,
          absentCount: record.status === "absent" ? 1 : 0,
          lateCount: record.status === "late" ? 1 : 0,
          excusedCount: record.status === "excused" ? 1 : 0,
        })
        return
      }

      existing.records.push(record)
      existing.latestActivity = Math.max(existing.latestActivity, t)
      if (record.status === "present") existing.presentCount += 1
      if (record.status === "absent") existing.absentCount += 1
      if (record.status === "late") existing.lateCount += 1
      if (record.status === "excused") existing.excusedCount += 1
    })

    return [...map.values()].sort((a, b) => b.latestActivity - a.latestActivity)
  }, [records])

  const quorumMetCount = useMemo(
    () =>
      groupedMeetings.filter((g) =>
        quorumMet(g.presentCount, g.lateCount, g.records.length)
      ).length,
    [groupedMeetings]
  )

  const filteredMeetings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return groupedMeetings
      .map((group) => {
        const filteredRecords = group.records.filter((r) => {
          const byStatus = statusFilter === "all" || r.status === statusFilter
          const bySearch =
            query.length === 0 ||
            `${r.memberName || ""} ${r.memberEmail || ""} ${r.meetingTitle || ""} ${r.notes || ""}`
              .toLowerCase()
              .includes(query)
          return byStatus && bySearch
        })
        return { ...group, records: filteredRecords }
      })
      .filter((group) => {
        if (quorumFilter === "all") return group.records.length > 0
        const met = quorumMet(
          group.presentCount,
          group.lateCount,
          group.records.length + group.absentCount + group.excusedCount
        )
        return quorumFilter === "met" ? met : !met
      })
      .filter((group) => {
        if (query.length === 0 && statusFilter === "all") return true
        return group.records.length > 0
      })
  }, [groupedMeetings, searchQuery, statusFilter, quorumFilter])

  const formatDateTime = (value?: string | number | Date | null) => {
    if (!value) return "-"
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return "-"
    return date.toLocaleString("en-RW", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="flex-1 space-y-6 pb-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Attendance Overview
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor quorum compliance and member attendance across all meetings.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setExportDialogOpen(true)}
            disabled={records.length === 0}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button
            variant="outline"
            onClick={() => void refetch()}
            disabled={isRefetching}>
            <RefreshCcw className="h-4 w-4" />
            {isRefetching ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error instanceof ApiErrorException
              ? error.help || error.message
              : "Failed to load attendance records"}
          </AlertDescription>
        </Alert>
      )}

      {/* ── Insight banner ── */}
      <Card className="overflow-hidden border-0 bg-linear-to-r from-indigo-500/15 via-violet-500/10 to-transparent shadow-none">
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              Executive attendance dashboard
            </div>
            <p className="max-w-xl text-sm text-foreground/90">
              Quorum is required for all binding decisions (2/3 of members).
              Review compliance across meetings and flag patterns of absence.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl border bg-background/90 px-3 py-2">
              <p className="text-xs text-muted-foreground">Attendance rate</p>
              <p className="text-xl font-semibold">{overallRate}%</p>
            </div>
            <div className="rounded-xl border bg-background/90 px-3 py-2">
              <p className="text-xs text-muted-foreground">Meetings logged</p>
              <p className="text-xl font-semibold">{uniqueMeetings}</p>
            </div>
            <div className="rounded-xl border bg-background/90 px-3 py-2">
              <p className="text-xs text-muted-foreground">Quorum met</p>
              <p className="text-xl font-semibold">
                {quorumMetCount}
                <span className="text-sm font-normal text-muted-foreground">
                  /{uniqueMeetings}
                </span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Stat cards ── */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Present</CardTitle>
            <UserCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div
                  className={cn(
                    "text-2xl font-semibold",
                    isRefetching && "opacity-70"
                  )}>
                  {summary.presentCount}
                </div>
                <p className="text-xs text-muted-foreground">Marked present</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Absent</CardTitle>
            <UserMinus className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div
                  className={cn(
                    "text-2xl font-semibold",
                    isRefetching && "opacity-70"
                  )}>
                  {summary.absentCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  Recorded absences
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Late</CardTitle>
            <CalendarCheck className="h-4 w-4 text-sky-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div
                  className={cn(
                    "text-2xl font-semibold",
                    isRefetching && "opacity-70"
                  )}>
                  {summary.lateCount}
                </div>
                <p className="text-xs text-muted-foreground">Late check-ins</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Excused</CardTitle>
            <Users className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div
                  className={cn(
                    "text-2xl font-semibold",
                    isRefetching && "opacity-70"
                  )}>
                  {summary.excusedCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  Approved excuses
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Meeting breakdown ── */}
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold">
              Meeting Attendance Breakdown
            </CardTitle>
            {isLoading ? (
              <Skeleton className="mt-2 h-4 w-48" />
            ) : (
              <p className="text-sm text-muted-foreground">
                {filteredMeetings.length} of {groupedMeetings.length} meetings
                shown
              </p>
            )}
          </div>

          {!isLoading && (
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300">
                <ShieldCheck className="mr-1 h-3 w-3" />
                Quorum met: {quorumMetCount}
              </Badge>
              <Badge className="bg-red-100 text-red-800 border border-red-300">
                <ShieldX className="mr-1 h-3 w-3" />
                No quorum: {groupedMeetings.length - quorumMetCount}
              </Badge>
            </div>
          )}
        </CardHeader>

        <CardContent>
          {/* Search + Filters */}
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search member, meeting, or notes…"
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {(["all", "present", "absent", "late", "excused"] as const).map(
                (s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={statusFilter === s ? "default" : "outline"}
                    onClick={() => setStatusFilter(s)}>
                    {s === "all"
                      ? "All"
                      : s.charAt(0).toUpperCase() + s.slice(1)}
                  </Button>
                )
              )}
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {(
              [
                { value: "all", label: "All meetings" },
                { value: "met", label: "Quorum met" },
                { value: "not_met", label: "No quorum" },
              ] as const
            ).map(({ value, label }) => (
              <Button
                key={value}
                size="sm"
                variant={quorumFilter === value ? "default" : "outline"}
                onClick={() => setQuorumFilter(value)}>
                {label}
              </Button>
            ))}
          </div>

          {/* Meeting list */}
          <div className="space-y-3">
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="space-y-3 p-4">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              ))}

            {!isLoading && filteredMeetings.length === 0 && (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <p className="font-medium">No meetings found</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try adjusting filters or search terms.
                </p>
              </div>
            )}

            {!isLoading &&
              filteredMeetings.map((meeting) => {
                const isOpen = expandedMeetingId === meeting.meetingId
                const totalMembers =
                  meeting.presentCount +
                  meeting.absentCount +
                  meeting.lateCount +
                  meeting.excusedCount
                const hasQuorum = quorumMet(
                  meeting.presentCount,
                  meeting.lateCount,
                  totalMembers
                )
                const attendanceRate =
                  totalMembers === 0
                    ? 0
                    : Math.round(
                        ((meeting.presentCount + meeting.lateCount) /
                          totalMembers) *
                          100
                      )

                return (
                  <Collapsible
                    key={meeting.meetingId}
                    open={isOpen}
                    onOpenChange={(open) =>
                      setExpandedMeetingId(open ? meeting.meetingId : "")
                    }>
                    <Card className="overflow-hidden">
                      <CardHeader className="px-4 py-3">
                        <CollapsibleTrigger asChild>
                          <button
                            type="button"
                            className="flex w-full items-start justify-between gap-3 text-left">
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <CardTitle className="text-base">
                                  {meeting.meetingTitle}
                                </CardTitle>
                                {hasQuorum ? (
                                  <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs">
                                    <ShieldCheck className="mr-1 h-3 w-3" />
                                    Quorum Met
                                  </Badge>
                                ) : (
                                  <Badge className="bg-red-100 text-red-800 border border-red-300 text-xs">
                                    <ShieldX className="mr-1 h-3 w-3" />
                                    No Quorum
                                  </Badge>
                                )}
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {meeting.records.length} records ·{" "}
                                {attendanceRate}% attendance ·{" "}
                                {formatDateTime(
                                  new Date(meeting.latestActivity)
                                )}
                              </p>
                            </div>
                            <ChevronDown
                              className={cn(
                                "mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                                isOpen && "rotate-180"
                              )}
                            />
                          </button>
                        </CollapsibleTrigger>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="default">
                            Present: {meeting.presentCount}
                          </Badge>
                          <Badge variant="secondary">
                            Late: {meeting.lateCount}
                          </Badge>
                          <Badge variant="outline">
                            Absent: {meeting.absentCount}
                          </Badge>
                          <Badge variant="outline">
                            Excused: {meeting.excusedCount}
                          </Badge>
                        </div>
                      </CardHeader>

                      <CollapsibleContent>
                        <CardContent className="p-4">
                          <div className="divide-y rounded-md border bg-background">
                            {meeting.records.map((record) => (
                              <div
                                key={record.id}
                                className="space-y-1.5 px-3 py-3">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <p className="font-medium">
                                      {record.memberName || "Member"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {record.memberEmail || record.memberId}
                                    </p>
                                  </div>
                                  {getStatusBadge(record.status)}
                                </div>

                                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                  <span className="inline-flex items-center gap-1">
                                    <Clock3 className="h-3.5 w-3.5" />
                                    {formatDateTime(
                                      record.checkedInAt || record.createdAt
                                    )}
                                  </span>
                                  {record.notes?.trim() && (
                                    <span className="italic">
                                      &ldquo;{record.notes}&rdquo;
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )
              })}
          </div>
        </CardContent>
      </Card>

      {/* ── Constitution note ── */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
            Constitution - Attendance Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>
            A quorum for any meeting is{" "}
            <strong className="text-foreground">
              2/3 of all registered members
            </strong>
            . No binding financial decisions can be made without quorum.
          </p>
          <p>
            Members unable to attend must notify the Secretary in advance.
            Repeated unexcused absence may be grounds for disciplinary action.
          </p>
        </CardContent>
      </Card>

      <ExportAttendanceDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        attendance={records}
        selectedAttendance={[]}
      />
    </div>
  )
}
