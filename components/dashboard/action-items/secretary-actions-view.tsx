"use client"

import { useMemo, useState } from "react"
import type { ActionItem } from "@/db/schemas/action-item-schema"
import type { ActionItemExportable } from "@/utils/action-item-export-utils"
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  Download,
  Gauge,
  ListFilter,
  RefreshCcw,
  Search,
  Sparkles,
  Target,
  UserRound,
  Workflow,
} from "lucide-react"

import { ApiErrorException } from "@/types/api"
import { cn } from "@/lib/utils"
import {
  useActionItems,
  type ActionItemRecord,
} from "@/hooks/api/use-action-items"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { DeleteActionItemDialog } from "@/components/dashboard/action-items/delete-action-item-dialog"
import { ExportActionItemsDialog } from "@/components/dashboard/action-items/export-action-items-dialog"
import { RecordActionItemTrigger } from "@/components/dashboard/action-items/record-action-item-trigger"
import { UpdateActionItemDialog } from "@/components/dashboard/action-items/update-action-item-dialog"

const EMPTY_ACTION_ITEMS: ActionItemRecord[] = []

const toExportableActionItem = (item: ActionItemRecord): ActionItemExportable =>
  ({
    id: item.id,
    title: item.title,
    description: item.description ?? null,
    status: item.status,
    priority: item.priority,
    dueDate: item.dueDate ? new Date(item.dueDate) : null,
    completedAt: item.completedAt ? new Date(item.completedAt) : null,
    meetingId: item.meetingId ?? null,
    minutesId: item.minutesId ?? null,
    ownerId: item.ownerId ?? null,
    createdBy: item.createdBy ?? null,
    notes: item.notes ?? null,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
    ownerName: item.ownerName ?? null,
    ownerEmail: item.ownerEmail ?? null,
    createdByName: item.createdByName ?? null,
    meetingTitle: item.meetingTitle ?? null,
  }) as ActionItemExportable

function getStatusColor(
  status: string
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "done":
      return "default"
    case "in_progress":
      return "secondary"
    case "blocked":
      return "destructive"
    case "open":
    case "cancelled":
      return "outline"
    default:
      return "outline"
  }
}

function getPriorityColor(
  priority: string
): "default" | "secondary" | "outline" {
  switch (priority) {
    case "urgent":
      return "default"
    case "high":
      return "secondary"
    case "medium":
    case "low":
      return "outline"
    default:
      return "outline"
  }
}

export function SecretaryActionsView() {
  const { data, isPending, isRefetching, error, refetch } = useActionItems({
    limit: 200,
  })
  const [statusFilter, setStatusFilter] = useState<
    "all" | "open" | "in_progress" | "blocked" | "done" | "cancelled"
  >("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [onlyOverdue, setOnlyOverdue] = useState(false)
  const [onlyUnassigned, setOnlyUnassigned] = useState(false)
  const [compactMobile, setCompactMobile] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [exportDialogOpen, setExportDialogOpen] = useState(false)

  const actionItems = data?.data ?? EMPTY_ACTION_ITEMS
  const isRefreshing = isRefetching

  const summary = useMemo(() => {
    const openCount = actionItems.filter(
      (item) => item.status === "open"
    ).length
    const doneCount = actionItems.filter(
      (item) => item.status === "done"
    ).length
    const inProgressCount = actionItems.filter(
      (item) => item.status === "in_progress"
    ).length
    const blockedCount = actionItems.filter(
      (item) => item.status === "blocked"
    ).length

    return {
      openCount,
      doneCount,
      inProgressCount,
      blockedCount,
      total: actionItems.length,
    }
  }, [actionItems])

  const filteredActionItems = useMemo(() => {
    const now = new Date()
    const query = searchQuery.trim().toLowerCase()

    return actionItems
      .filter((item) => {
        const dueDate = item.dueDate ? new Date(item.dueDate) : null
        const overdue =
          !!dueDate &&
          !Number.isNaN(dueDate.getTime()) &&
          dueDate.getTime() < now.getTime() &&
          item.status !== "done" &&
          item.status !== "cancelled"
        const unassigned = !item.ownerId && !item.ownerName

        const byStatus = statusFilter === "all" || item.status === statusFilter
        const byOverdue = !onlyOverdue || overdue
        const byUnassigned = !onlyUnassigned || unassigned
        const bySearch =
          query.length === 0 ||
          `${item.title || ""} ${item.description || ""} ${item.ownerName || ""} ${item.meetingTitle || ""} ${item.notes || ""}`
            .toLowerCase()
            .includes(query)

        return byStatus && byOverdue && byUnassigned && bySearch
      })
      .sort((a, b) => {
        const aDue = a.dueDate
          ? new Date(a.dueDate).getTime()
          : Number.MAX_SAFE_INTEGER
        const bDue = b.dueDate
          ? new Date(b.dueDate).getTime()
          : Number.MAX_SAFE_INTEGER
        return aDue - bDue
      })
  }, [actionItems, onlyOverdue, onlyUnassigned, searchQuery, statusFilter])

  const quickFilterCounts = useMemo(() => {
    const now = new Date().getTime()

    return actionItems.reduce(
      (acc, item) => {
        const due = item.dueDate ? new Date(item.dueDate).getTime() : null
        if (
          due &&
          !Number.isNaN(due) &&
          due < now &&
          item.status !== "done" &&
          item.status !== "cancelled"
        ) {
          acc.overdue += 1
        }
        if (!item.ownerId && !item.ownerName) {
          acc.unassigned += 1
        }
        return acc
      },
      { overdue: 0, unassigned: 0 }
    )
  }, [actionItems])

  const selectedActionItems = useMemo(
    () => actionItems.filter((item) => selectedIds.includes(item.id)),
    [actionItems, selectedIds]
  )

  const exportActionItems = useMemo(
    () => actionItems.map(toExportableActionItem),
    [actionItems]
  )

  const exportSelectedActionItems = useMemo(
    () => selectedActionItems.map(toExportableActionItem),
    [selectedActionItems]
  )

  const formatDateTime = (value?: string | Date | null) => {
    if (!value) return "No date"
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return "No date"
    return date.toLocaleString("en-RW", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    )
  }

  const clearSelection = () => {
    setSelectedIds([])
  }

  const isLoading = isPending && actionItems.length === 0

  return (
    <div className="flex-1 space-y-6 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Secretary Actions Hub
          </h1>
          <p className="text-sm text-muted-foreground">
            Track follow-ups, unblock owners, and move meeting commitments to
            completion.
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

          <RecordActionItemTrigger onSuccess={() => void refetch()} />

          <Button
            variant="outline"
            onClick={() => setExportDialogOpen(true)}
            disabled={actionItems.length === 0}>
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
              : "Failed to load action items"}
          </AlertDescription>
        </Alert>
      )}

      <Card className="overflow-hidden border-0 bg-linear-to-r from-amber-500/15 via-orange-500/10 to-transparent shadow-none">
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              Follow-up command workspace
            </div>
            <p className="max-w-xl text-sm text-foreground/90">
              Prioritize overdue and unassigned tasks, then drive progress with
              quick updates and owner accountability.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border bg-background/90 px-3 py-2">
              <p className="text-xs text-muted-foreground">Action items</p>
              <p className="text-xl font-semibold">{summary.total}</p>
            </div>
            <div className="rounded-xl border bg-background/90 px-3 py-2">
              <p className="text-xs text-muted-foreground">Overdue now</p>
              <p className="text-xl font-semibold">
                {quickFilterCounts.overdue}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Open Tasks</CardTitle>
            <CircleDot className="h-4 w-4 text-amber-500" />
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
                  {summary.openCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  Awaiting completion
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Workflow className="h-4 w-4 text-blue-500" />
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
                  {summary.inProgressCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  Actively being worked on
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Blocked</CardTitle>
            <Target className="h-4 w-4 text-rose-500" />
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
                  {summary.blockedCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  Needs intervention
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
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
                  {summary.doneCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  Closed action items
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
              Actions Stream
            </CardTitle>
            {isLoading ? (
              <Skeleton className="mt-2 h-4 w-56" />
            ) : (
              <p className="text-sm text-muted-foreground">
                Showing {filteredActionItems.length} of {summary.total} records
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
              <Badge variant="outline">Open: {summary.openCount}</Badge>
              <Badge variant="secondary">
                In progress: {summary.inProgressCount}
              </Badge>
              <Badge variant="destructive">
                Blocked: {summary.blockedCount}
              </Badge>
              <Badge variant="default">Done: {summary.doneCount}</Badge>
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
                placeholder="Search title, owner, meeting, or notes"
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {(
                [
                  "all",
                  "open",
                  "in_progress",
                  "blocked",
                  "done",
                  "cancelled",
                ] as const
              ).map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={statusFilter === status ? "default" : "outline"}
                  onClick={() => setStatusFilter(status)}>
                  {status === "all" ? "All" : status.replace("_", " ")}
                </Button>
              ))}
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1.5 px-2 py-1">
              <ListFilter className="h-3.5 w-3.5" />
              Follow-up chips
            </Badge>
            <Button
              size="sm"
              variant={onlyOverdue ? "default" : "outline"}
              onClick={() => setOnlyOverdue((prev) => !prev)}>
              Overdue tasks ({quickFilterCounts.overdue})
            </Button>
            <Button
              size="sm"
              variant={onlyUnassigned ? "default" : "outline"}
              onClick={() => setOnlyUnassigned((prev) => !prev)}>
              Unassigned owners ({quickFilterCounts.unassigned})
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

            {!isLoading && filteredActionItems.length === 0 && (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <p className="font-medium">
                  No action items match your filters
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Adjust status, quick chips, or search to reveal more tasks.
                </p>
              </div>
            )}

            {!isLoading && filteredActionItems.length > 0 && (
              <div
                className={cn(
                  "grid md:grid-cols-2",
                  compactMobile ? "gap-2" : "gap-3"
                )}>
                {filteredActionItems.map((item) => {
                  const selected = selectedIds.includes(item.id)

                  return (
                    <Card
                      key={item.id}
                      className={cn(
                        "transition-all",
                        selected && "ring-2 ring-amber-500/50"
                      )}>
                      <CardContent
                        className={cn(
                          "space-y-3",
                          compactMobile ? "p-3 md:p-4" : "p-4"
                        )}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="line-clamp-1 font-semibold">
                              {item.title}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Target className="h-3.5 w-3.5" />
                              {item.meetingTitle || "No meeting linked"}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={selected}
                              onCheckedChange={() => toggleSelection(item.id)}
                              aria-label="Select action item for export"
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Badge variant={getStatusColor(item.status)}>
                            {item.status.replace("_", " ")}
                          </Badge>
                          <Badge variant={getPriorityColor(item.priority)}>
                            {item.priority}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-md border p-2">
                            <p className="text-muted-foreground">Owner</p>
                            <p className="line-clamp-1 font-medium">
                              {item.ownerName ||
                                item.ownerEmail ||
                                "Unassigned"}
                            </p>
                          </div>
                          <div className="rounded-md border p-2">
                            <p className="text-muted-foreground">Due date</p>
                            <p className="font-medium">
                              {formatDateTime(item.dueDate)}
                            </p>
                          </div>
                        </div>

                        <p
                          className={cn(
                            "text-sm text-muted-foreground",
                            compactMobile && "md:block hidden"
                          )}>
                          {item.description?.trim() ||
                            item.notes?.trim() ||
                            "No details yet. Add context for better follow-up quality."}
                        </p>

                        <Separator
                          className={cn(compactMobile && "hidden md:block")}
                        />

                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div
                            className={cn(
                              "flex items-center gap-1 text-xs text-muted-foreground",
                              compactMobile && "hidden md:flex"
                            )}>
                            <CalendarClock className="h-3.5 w-3.5" />
                            Updated {formatDateTime(item.updatedAt)}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="hidden items-center gap-1 text-xs text-muted-foreground md:flex">
                              <UserRound className="h-3.5 w-3.5" />
                              {item.createdByName || "Secretary"}
                            </div>
                            <UpdateActionItemDialog
                              actionItem={item as ActionItem}
                              onUpdated={() => {
                                void refetch()
                              }}
                            />
                            <DeleteActionItemDialog
                              actionItem={item}
                              onDeleted={() => {
                                void refetch()
                              }}
                            />
                          </div>
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

      <ExportActionItemsDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        actionItems={exportActionItems}
        selectedActionItems={exportSelectedActionItems}
      />
    </div>
  )
}
