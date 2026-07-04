"use client"

import { useMemo, useState } from "react"
import type { MeetingMinutes } from "@/db/schemas/minutes-schema"
import type { MinutesExportable } from "@/utils/minutes-export-utils"
import {
  AlertTriangle,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  ClipboardList,
  Clock3,
  Download,
  Eye,
  FileText,
  Gauge,
  ListFilter,
  RefreshCcw,
  Search,
  Sparkles,
} from "lucide-react"

import { ApiErrorException } from "@/types/api"
import { cn } from "@/lib/utils"
import { useMinutes } from "@/hooks/api/use-minutes"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { ExportMinutesDialog } from "@/components/dashboard/minutes/export-minutes-dialog"
import { RecordMinutesTrigger } from "@/components/dashboard/minutes/record-minutes-trigger"
import { UpdateMinutesDialog } from "@/components/dashboard/minutes/update-minutes-dialog"

interface SecretaryMinutesViewProps {
  nextMeetingDate?: Date | null
}

function getStatusColor(status: string): "default" | "secondary" | "outline" {
  switch (status) {
    case "published":
      return "default"
    case "finalized":
      return "secondary"
    case "draft":
      return "outline"
    default:
      return "default"
  }
}

export function SecretaryMinutesView({
  nextMeetingDate = null,
}: SecretaryMinutesViewProps) {
  const { data, isPending, isRefetching, error, refetch } = useMinutes({
    limit: 200,
  })
  const [statusFilter, setStatusFilter] = useState<
    "all" | "draft" | "finalized" | "published"
  >("all")
  const [onlyPendingActions, setOnlyPendingActions] = useState(false)
  const [onlyNeedsSummary, setOnlyNeedsSummary] = useState(false)
  const [compactMobile, setCompactMobile] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedMinuteIds, setSelectedMinuteIds] = useState<string[]>([])
  const [exportDialogOpen, setExportDialogOpen] = useState(false)

  const minutes = (data?.data as MinutesExportable[]) ?? []
  const isRefreshing = isRefetching

  const summary = useMemo(() => {
    const records = minutes || []
    const statusCounts: Record<string, number> = {}
    const totalMinutes = records.length

    records.forEach((item) => {
      statusCounts[item.status] = (statusCounts[item.status] || 0) + 1
    })

    return {
      total: totalMinutes,
      draft: statusCounts.draft || 0,
      finalized: statusCounts.finalized || 0,
      published: statusCounts.published || 0,
      statusCounts,
    }
  }, [minutes])

  const filteredMinutes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return minutes
      .filter((minute) => {
        const pendingActions =
          minute.actionItems?.items?.filter(
            (item) => (item.status || "").toLowerCase() !== "done"
          ).length || 0
        const needsSummary = !minute.summary?.trim()
        const byStatus =
          statusFilter === "all" || minute.status === statusFilter
        const bySearch =
          query.length === 0 ||
          `${minute.meetingTitle || ""} ${minute.summary || ""} ${minute.recordedByName || ""}`
            .toLowerCase()
            .includes(query)
        const byPendingActions = !onlyPendingActions || pendingActions > 0
        const bySummaryState = !onlyNeedsSummary || needsSummary

        return byStatus && bySearch && byPendingActions && bySummaryState
      })
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt).getTime() -
          new Date(a.updatedAt || a.createdAt).getTime()
      )
  }, [minutes, onlyNeedsSummary, onlyPendingActions, searchQuery, statusFilter])

  const quickFilterCounts = useMemo(() => {
    return minutes.reduce(
      (acc, minute) => {
        const pendingActions =
          minute.actionItems?.items?.filter(
            (item) => (item.status || "").toLowerCase() !== "done"
          ).length || 0
        const needsSummary = !minute.summary?.trim()

        if (pendingActions > 0) acc.pendingActions += 1
        if (needsSummary) acc.needsSummary += 1
        return acc
      },
      { pendingActions: 0, needsSummary: 0 }
    )
  }, [minutes])

  const selectedMinutes = useMemo(
    () => minutes.filter((minute) => selectedMinuteIds.includes(minute.id)),
    [minutes, selectedMinuteIds]
  )

  const toggleSelection = (id: string) => {
    setSelectedMinuteIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const clearSelection = () => {
    setSelectedMinuteIds([])
  }

  const formatDateTime = (value?: string | Date | null) => {
    if (!value) return "No date"
    const parsed = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(parsed.getTime())) return "No date"

    return parsed.toLocaleString("en-RW", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const statusMeta: Record<
    "draft" | "finalized" | "published",
    { label: string; icon: React.ComponentType<{ className?: string }> }
  > = {
    draft: { label: "Draft", icon: CircleDashed },
    finalized: { label: "Finalized", icon: CheckCircle2 },
    published: { label: "Published", icon: Eye },
  }

  const actionItemsPending = useMemo(() => {
    return minutes.reduce((total, minute) => {
      const pending =
        minute.actionItems?.items?.filter(
          (item) => (item.status || "").toLowerCase() !== "done"
        ).length || 0
      return total + pending
    }, 0)
  }, [minutes])

  const handleRefresh = async () => {
    await refetch()
  }

  const isLoading = isPending && minutes.length === 0

  return (
    <div className="flex-1 space-y-6 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Secretary Minutes Hub
          </h1>
          <p className="text-sm text-muted-foreground">
            A polished workspace for capturing decisions, tracking follow-ups,
            and publishing board-ready minutes.
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

          <RecordMinutesTrigger onSuccess={handleRefresh} />

          <Button
            variant="outline"
            onClick={() => setExportDialogOpen(true)}
            disabled={minutes.length === 0}>
            <Download className="h-4 w-4" />
            Export
          </Button>

          <Button
            variant="outline"
            onClick={handleRefresh}
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
              : "Failed to refresh minutes"}
          </AlertDescription>
        </Alert>
      )}

      <Card className="overflow-hidden border-0 bg-linear-to-r from-cyan-500/15 via-sky-500/10 to-transparent shadow-none">
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-cyan-600" />
              Secretary workflow cockpit
            </div>
            <p className="max-w-xl text-sm text-foreground/90">
              Keep draft quality high, drive approvals forward, and publish with
              confidence before your next meeting window.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border bg-background/90 px-3 py-2">
              <p className="text-xs text-muted-foreground">Records in scope</p>
              <p className="text-xl font-semibold">{summary.total}</p>
            </div>
            <div className="rounded-xl border bg-background/90 px-3 py-2">
              <p className="text-xs text-muted-foreground">Pending actions</p>
              <p className="text-xl font-semibold">{actionItemsPending}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Meeting</CardTitle>
            <Briefcase className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <>
                <Skeleton className="h-8 w-32" />
                <Skeleton className="mt-2 h-3 w-40" />
              </>
            ) : (
              <>
                <div className="text-2xl font-semibold">
                  {nextMeetingDate
                    ? nextMeetingDate.toLocaleDateString("en-RW", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "TBD"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Scheduled meeting date
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft Minutes</CardTitle>
            <ClipboardList className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="mt-2 h-3 w-32" />
              </>
            ) : (
              <>
                <div
                  className={cn(
                    "text-2xl font-semibold transition-opacity",
                    isRefreshing && "opacity-80"
                  )}>
                  {summary.draft}
                </div>
                <p className="text-xs text-muted-foreground">Pending review</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Finalized</CardTitle>
            <Briefcase className="h-4 w-4 text-sky-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="mt-2 h-3 w-36" />
              </>
            ) : (
              <>
                <div
                  className={cn(
                    "text-2xl font-semibold transition-opacity",
                    isRefreshing && "opacity-80"
                  )}>
                  {summary.finalized}
                </div>
                <p className="text-xs text-muted-foreground">
                  Ready to publish
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <FileText className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="mt-2 h-3 w-32" />
              </>
            ) : (
              <>
                <div
                  className={cn(
                    "text-2xl font-semibold transition-opacity",
                    isRefreshing && "opacity-80"
                  )}>
                  {summary.published}
                </div>
                <p className="text-xs text-muted-foreground">
                  Member accessible
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
              Minutes Stream
            </CardTitle>
            {isLoading ? (
              <Skeleton className="mt-2 h-4 w-52" />
            ) : (
              <p className="text-sm text-muted-foreground">
                Showing {filteredMinutes.length} of {summary.total} records
                {Object.entries(summary.statusCounts).length > 0 && (
                  <span className="ml-2">
                    (
                    {Object.entries(summary.statusCounts)
                      .map(([status, count]) => `${status}: ${count}`)
                      .join(", ")}
                    )
                  </span>
                )}
              </p>
            )}
          </div>

          {!isLoading && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={clearSelection}
                disabled={selectedMinuteIds.length === 0}>
                Clear selection ({selectedMinuteIds.length})
              </Button>
              {Object.entries(summary.statusCounts).map(([status, count]) => (
                <Badge key={status} variant={getStatusColor(status)}>
                  {status}: {count}
                </Badge>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isRefreshing && (
            <div className="mb-3 h-1.5 w-40  rounded-full bg-muted animate-pulse" />
          )}

          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by meeting title, summary, or recorder"
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {(["all", "draft", "finalized", "published"] as const).map(
                (status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={statusFilter === status ? "default" : "outline"}
                    onClick={() => setStatusFilter(status)}>
                    {status === "all" ? "All" : statusMeta[status].label}
                  </Button>
                )
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1.5 px-2 py-1">
                <ListFilter className="h-3.5 w-3.5" />
                Follow-up chips
              </Badge>
              <Button
                size="sm"
                variant={onlyPendingActions ? "default" : "outline"}
                onClick={() => setOnlyPendingActions((prev) => !prev)}>
                Only with pending actions ({quickFilterCounts.pendingActions})
              </Button>
              <Button
                size="sm"
                variant={onlyNeedsSummary ? "default" : "outline"}
                onClick={() => setOnlyNeedsSummary((prev) => !prev)}>
                Needs summary ({quickFilterCounts.needsSummary})
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {isLoading && (
              <div className="grid gap-3 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Card key={index}>
                    <CardContent className="space-y-3 p-4">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!isLoading && filteredMinutes.length === 0 && (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <p className="font-medium">No minutes match current filters</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Adjust search keywords or status filters to reveal more
                  records.
                </p>
              </div>
            )}

            {!isLoading && filteredMinutes.length > 0 && (
              <div
                className={cn(
                  "grid md:grid-cols-2",
                  compactMobile ? "gap-2" : "gap-3"
                )}>
                {filteredMinutes.map((minute) => {
                  const selected = selectedMinuteIds.includes(minute.id)
                  const totalActions = minute.actionItems?.items?.length || 0
                  const pendingActions =
                    minute.actionItems?.items?.filter(
                      (item) => (item.status || "").toLowerCase() !== "done"
                    ).length || 0
                  const totalDecisions = minute.decisions?.items?.length || 0
                  const attendees = minute.attendance?.presentIds?.length || 0

                  return (
                    <Card
                      key={minute.id}
                      className={cn(
                        "transition-all",
                        selected && "ring-2 ring-cyan-500/50"
                      )}>
                      <CardContent
                        className={cn(
                          "space-y-3",
                          compactMobile ? "p-3 md:p-4" : "p-4"
                        )}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="line-clamp-1 font-semibold">
                              {minute.meetingTitle || "Meeting Minutes"}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock3 className="h-3.5 w-3.5" />
                              Updated{" "}
                              {formatDateTime(
                                minute.updatedAt || minute.createdAt
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={selected}
                              onCheckedChange={() => toggleSelection(minute.id)}
                              aria-label="Select minute for export"
                            />
                            <Badge variant={getStatusColor(minute.status)}>
                              {minute.status}
                            </Badge>
                            {pendingActions > 0 && (
                              <Badge variant="outline">
                                {pendingActions} pending
                              </Badge>
                            )}
                          </div>
                        </div>

                        {minute.summary ? (
                          <p
                            className={cn(
                              "line-clamp-2 text-sm text-muted-foreground",
                              compactMobile && "md:block hidden"
                            )}>
                            {minute.summary}
                          </p>
                        ) : (
                          <p
                            className={cn(
                              "text-sm text-muted-foreground",
                              compactMobile && "md:block hidden"
                            )}>
                            No summary yet. Add a concise recap for leadership
                            visibility.
                          </p>
                        )}

                        <div
                          className={cn(
                            "grid grid-cols-3 text-xs",
                            compactMobile ? "gap-1.5" : "gap-2"
                          )}>
                          <div
                            className={cn(
                              "rounded-md border",
                              compactMobile ? "p-1.5" : "p-2"
                            )}>
                            <p className="text-muted-foreground">Actions</p>
                            <p className="text-sm font-semibold">
                              {totalActions}
                            </p>
                          </div>
                          <div
                            className={cn(
                              "rounded-md border",
                              compactMobile ? "p-1.5" : "p-2"
                            )}>
                            <p className="text-muted-foreground">Decisions</p>
                            <p className="text-sm font-semibold">
                              {totalDecisions}
                            </p>
                          </div>
                          <div
                            className={cn(
                              "rounded-md border",
                              compactMobile ? "p-1.5" : "p-2"
                            )}>
                            <p className="text-muted-foreground">Present</p>
                            <p className="text-sm font-semibold">{attendees}</p>
                          </div>
                        </div>

                        <Separator
                          className={cn(compactMobile && "hidden md:block")}
                        />

                        <div
                          className={cn(
                            "flex flex-wrap items-center justify-between gap-2",
                            compactMobile && "pt-0.5"
                          )}>
                          <div
                            className={cn(
                              "flex items-center gap-1 text-xs text-muted-foreground",
                              compactMobile && "hidden md:flex"
                            )}>
                            <CalendarClock className="h-3.5 w-3.5" />
                            Created {formatDateTime(minute.createdAt)}
                          </div>

                          <UpdateMinutesDialog
                            minutes={minute as MeetingMinutes}
                            onUpdated={handleRefresh}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <ExportMinutesDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        minutes={minutes}
        selectedMinutes={selectedMinutes}
      />
    </div>
  )
}
