"use client"

import { useEffect, useMemo, useState } from "react"
import type { AttendanceExportable } from "@/utils/attendance-export-utils"
import {
  AlertTriangle,
  CalendarCheck,
  ChevronDown,
  Clock3,
  Download,
  Gauge,
  ListFilter,
  RefreshCcw,
  Search,
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
import { Checkbox } from "@/components/ui/checkbox"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { ExportAttendanceDialog } from "@/components/dashboard/attendance/export-attendance-dialog"
import { RecordAttendanceTrigger } from "@/components/dashboard/attendance/record-attendance-trigger"
import { UpdateAttendanceDialog } from "@/components/dashboard/attendance/update-attendance-dialog"

function getStatusColor(status: string): "default" | "secondary" | "outline" {
  switch (status) {
    case "present":
      return "default"
    case "late":
      return "secondary"
    case "absent":
    case "excused":
      return "outline"
    default:
      return "outline"
  }
}

export function SecretaryAttendanceView() {
  const { data, isPending, isRefetching, error, refetch } = useAttendance({
    limit: 200,
  })
  const [statusFilter, setStatusFilter] = useState<
    "all" | "present" | "absent" | "late" | "excused"
  >("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [onlyLate, setOnlyLate] = useState(false)
  const [onlyNeedsNotes, setOnlyNeedsNotes] = useState(false)
  const [compactMobile, setCompactMobile] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [expandedMeetingId, setExpandedMeetingId] = useState<string>("")

  const records = (data?.data as AttendanceExportable[]) ?? []
  const isRefreshing = isRefetching

  const summary = useMemo(() => {
    const presentCount = records.filter(
      (item) => item.status === "present"
    ).length
    const absentCount = records.filter(
      (item) => item.status === "absent"
    ).length
    const lateCount = records.filter((item) => item.status === "late").length
    const excusedCount = records.filter(
      (item) => item.status === "excused"
    ).length

    return {
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
      total: records.length,
    }
  }, [records])

  const filteredRecords = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return records
      .filter((item) => {
        const byStatus = statusFilter === "all" || item.status === statusFilter
        const byLate = !onlyLate || item.status === "late"
        const byNeedsNotes = !onlyNeedsNotes || !item.notes?.trim()
        const bySearch =
          query.length === 0 ||
          `${item.memberName || ""} ${item.memberEmail || ""} ${item.meetingTitle || ""} ${item.notes || ""}`
            .toLowerCase()
            .includes(query)

        return byStatus && byLate && byNeedsNotes && bySearch
      })
      .sort(
        (a, b) =>
          new Date(b.checkedInAt || b.createdAt).getTime() -
          new Date(a.checkedInAt || a.createdAt).getTime()
      )
  }, [records, searchQuery, statusFilter, onlyLate, onlyNeedsNotes])

  const quickFilterCounts = useMemo(() => {
    return records.reduce(
      (acc, item) => {
        if (item.status === "late") acc.late += 1
        if (!item.notes?.trim()) acc.needsNotes += 1
        return acc
      },
      { late: 0, needsNotes: 0 }
    )
  }, [records])

  const selectedAttendance = useMemo(
    () => records.filter((item) => selectedIds.includes(item.id)),
    [records, selectedIds]
  )

  const groupedRecords = useMemo(() => {
    const grouped = new Map<
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

    filteredRecords.forEach((record) => {
      const key = record.meetingId || "unknown-meeting"
      const existing = grouped.get(key)
      const activityTime = new Date(
        record.checkedInAt || record.createdAt
      ).getTime()

      if (!existing) {
        grouped.set(key, {
          meetingId: key,
          meetingTitle: record.meetingTitle || "Meeting",
          records: [record],
          latestActivity: activityTime,
          presentCount: record.status === "present" ? 1 : 0,
          absentCount: record.status === "absent" ? 1 : 0,
          lateCount: record.status === "late" ? 1 : 0,
          excusedCount: record.status === "excused" ? 1 : 0,
        })
        return
      }

      existing.records.push(record)
      existing.latestActivity = Math.max(existing.latestActivity, activityTime)
      if (record.status === "present") existing.presentCount += 1
      if (record.status === "absent") existing.absentCount += 1
      if (record.status === "late") existing.lateCount += 1
      if (record.status === "excused") existing.excusedCount += 1
    })

    return [...grouped.values()].sort(
      (a, b) => b.latestActivity - a.latestActivity
    )
  }, [filteredRecords])

  useEffect(() => {
    if (groupedRecords.length === 0) {
      setExpandedMeetingId("")
      return
    }

    const exists = groupedRecords.some(
      (group) => group.meetingId === expandedMeetingId
    )
    if (!exists) {
      setExpandedMeetingId("")
    }
  }, [groupedRecords, expandedMeetingId])

  const formatDateTime = (value?: string | number | Date | null) => {
    if (!value) return "No timestamp"
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return "No timestamp"
    return date.toLocaleString("en-RW", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const meetingCoverage =
    summary.total === 0
      ? 0
      : Math.round((summary.presentCount / summary.total) * 100)
  const uniqueMeetings = new Set(records.map((item) => item.meetingId)).size

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const clearSelection = () => {
    setSelectedIds([])
  }

  const isLoading = isPending && records.length === 0

  return (
    <div className="flex-1 space-y-6 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Secretary Attendance Hub
          </h1>
          <p className="text-sm text-muted-foreground">
            Track check-ins, resolve late arrivals, and prepare clean attendance
            records for leadership review.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={compactMobile ? "default" : "outline"}
            size="sm"
            onClick={() => setCompactMobile((prev) => !prev)}
            className="md:hidden">
            <Gauge className="h-4 w-4" />
            {compactMobile ? "Comfort View" : "Compact Mobile"}
          </Button>

          <RecordAttendanceTrigger onSuccess={() => void refetch()} />

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
            disabled={isRefreshing}>
            <RefreshCcw className="h-4 w-4" />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error instanceof ApiErrorException
              ? error.help || error.message
              : "Failed to load attendance"}
          </AlertDescription>
        </Alert>
      )}

      <Card className="overflow-hidden border-0 bg-linear-to-r from-emerald-500/15 via-cyan-500/10 to-transparent shadow-none">
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              Attendance command workspace
            </div>
            <p className="max-w-xl text-sm text-foreground/90">
              Focus on follow-up first: identify late arrivals, fill missing
              notes, and keep meeting attendance audit-ready.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border bg-background/90 px-3 py-2">
              <p className="text-xs text-muted-foreground">Meeting coverage</p>
              <p className="text-xl font-semibold">{meetingCoverage}%</p>
            </div>
            <div className="rounded-xl border bg-background/90 px-3 py-2">
              <p className="text-xs text-muted-foreground">Meetings logged</p>
              <p className="text-xl font-semibold">{uniqueMeetings}</p>
            </div>
          </div>
        </CardContent>
      </Card>

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
                    isRefreshing && "opacity-80"
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
                    isRefreshing && "opacity-80"
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
                    isRefreshing && "opacity-80"
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
            <CalendarCheck className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div
                  className={cn(
                    "text-2xl font-semibold",
                    isRefreshing && "opacity-80"
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

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold">
              Attendance Stream
            </CardTitle>
            {isLoading ? (
              <Skeleton className="mt-2 h-4 w-56" />
            ) : (
              <p className="text-sm text-muted-foreground">
                Showing {filteredRecords.length} of {summary.total} records
              </p>
            )}
          </div>

          {!isLoading && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={clearSelection}
                disabled={selectedIds.length === 0}>
                Clear selection ({selectedIds.length})
              </Button>
              <Badge variant="default">Present: {summary.presentCount}</Badge>
              <Badge variant="secondary">Late: {summary.lateCount}</Badge>
              <Badge variant="outline">Absent: {summary.absentCount}</Badge>
              <Badge variant="outline">Excused: {summary.excusedCount}</Badge>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isRefreshing && (
            <div className="mb-3 h-1.5 w-40 rounded-full bg-muted animate-pulse" />
          )}

          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search member, meeting, or notes"
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {(["all", "present", "absent", "late", "excused"] as const).map(
                (status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={statusFilter === status ? "default" : "outline"}
                    onClick={() => setStatusFilter(status)}>
                    {status === "all"
                      ? "All"
                      : status.charAt(0).toUpperCase() + status.slice(1)}
                  </Button>
                )
              )}
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1.5 px-2 py-1">
              <ListFilter className="h-3.5 w-3.5" />
              Follow-up chips
            </Badge>
            <Button
              size="sm"
              variant={onlyLate ? "default" : "outline"}
              onClick={() => setOnlyLate((prev) => !prev)}>
              Only late arrivals ({quickFilterCounts.late})
            </Button>
            <Button
              size="sm"
              variant={onlyNeedsNotes ? "default" : "outline"}
              onClick={() => setOnlyNeedsNotes((prev) => !prev)}>
              Needs notes ({quickFilterCounts.needsNotes})
            </Button>
          </div>

          <div className="space-y-3">
            {isLoading && (
              <div className="grid gap-3 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Card key={index}>
                    <CardContent className="space-y-3 p-4">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!isLoading && filteredRecords.length === 0 && (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <p className="font-medium">No attendance records found</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try adjusting status filters, follow-up chips, or search
                  terms.
                </p>
              </div>
            )}

            {!isLoading && filteredRecords.length > 0 && (
              <div className="space-y-3">
                {groupedRecords.map((meetingGroup) => {
                  const isOpen = expandedMeetingId === meetingGroup.meetingId

                  return (
                    <Collapsible
                      key={meetingGroup.meetingId}
                      open={isOpen}
                      onOpenChange={(open) => {
                        setExpandedMeetingId(open ? meetingGroup.meetingId : "")
                      }}>
                      <Card className="overflow-hidden">
                        <CardHeader className="px-4 py-3">
                          <CollapsibleTrigger asChild>
                            <button
                              type="button"
                              className="flex w-full items-start justify-between gap-3 text-left">
                              <div>
                                <CardTitle className="text-base">
                                  {meetingGroup.meetingTitle}
                                </CardTitle>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {meetingGroup.records.length} attendance
                                  records • Latest update{" "}
                                  {formatDateTime(
                                    new Date(meetingGroup.latestActivity)
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
                              Present: {meetingGroup.presentCount}
                            </Badge>
                            <Badge variant="secondary">
                              Late: {meetingGroup.lateCount}
                            </Badge>
                            <Badge variant="outline">
                              Absent: {meetingGroup.absentCount}
                            </Badge>
                            <Badge variant="outline">
                              Excused: {meetingGroup.excusedCount}
                            </Badge>
                          </div>
                        </CardHeader>

                        <CollapsibleContent>
                          <CardContent
                            className={cn(compactMobile ? "p-3" : "p-4")}>
                            <div className="divide-y rounded-md border bg-background">
                              {meetingGroup.records.map((record) => {
                                const selected = selectedIds.includes(record.id)

                                return (
                                  <div
                                    key={record.id}
                                    className={cn(
                                      "space-y-2 px-3 py-3",
                                      selected && "bg-emerald-50/60"
                                    )}>
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                      <div>
                                        <p className="font-medium">
                                          {record.memberName || "Member"}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {record.memberEmail ||
                                            record.memberId}
                                        </p>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <Checkbox
                                          checked={selected}
                                          onCheckedChange={() =>
                                            toggleSelection(record.id)
                                          }
                                          aria-label="Select attendance for export"
                                        />
                                        <Badge
                                          variant={getStatusColor(
                                            record.status
                                          )}>
                                          {record.status}
                                        </Badge>
                                      </div>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                                      <span className="inline-flex items-center gap-1">
                                        <Clock3 className="h-3.5 w-3.5" />
                                        Checked in{" "}
                                        {formatDateTime(
                                          record.checkedInAt || record.createdAt
                                        )}
                                      </span>
                                      <span>
                                        Captured{" "}
                                        {formatDateTime(record.createdAt)}
                                      </span>
                                    </div>

                                    {record.notes?.trim() ? (
                                      <p className="text-sm text-muted-foreground">
                                        {record.notes}
                                      </p>
                                    ) : (
                                      <p className="text-sm text-muted-foreground">
                                        No notes provided yet. Add context for
                                        late/absent cases.
                                      </p>
                                    )}

                                    <div className="flex justify-end">
                                      <UpdateAttendanceDialog
                                        attendance={record}
                                        onUpdated={() => {
                                          void refetch()
                                        }}
                                      />
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  )
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <ExportAttendanceDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        attendance={records}
        selectedAttendance={selectedAttendance}
      />
    </div>
  )
}
