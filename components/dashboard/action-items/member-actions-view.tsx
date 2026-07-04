"use client"

import { useState } from "react"
import type { ActionItem } from "@/db/schemas/action-item-schema"
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  CircleDot,
  ClipboardList,
  Clock,
  RefreshCcw,
  Search,
  TrendingUp,
  Zap,
  type LucideIcon,
} from "lucide-react"

import { ApiErrorException } from "@/types/api"
import { cn } from "@/lib/utils"
import {
  useActionItems,
  type ActionItemRecord,
} from "@/hooks/api/use-action-items"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MemberActionItemDialog } from "@/components/dashboard/action-items/member-action-item-dialog"

// ─── helpers ────────────────────────────────────────────────────────────────

function toDate(v?: string | Date | null): Date | null {
  if (!v) return null
  const d = v instanceof Date ? v : new Date(v)
  return isNaN(d.getTime()) ? null : d
}

function formatDate(v?: string | Date | null) {
  const d = toDate(v)
  if (!d) return null
  return d.toLocaleDateString("en-RW", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function startOfDay(d: Date) {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c
}

function endOfDay(d: Date) {
  const c = new Date(d)
  c.setHours(23, 59, 59, 999)
  return c
}

type Group = "overdue" | "today" | "week" | "upcoming" | "done" | "no_date"

function getGroup(item: ActionItemRecord): Group {
  if (item.status === "done" || item.status === "cancelled") return "done"
  const due = toDate(item.dueDate)
  if (!due) return "no_date"
  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)
  const weekEnd = new Date(todayStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  if (due < todayStart) return "overdue"
  if (due <= todayEnd) return "today"
  if (due <= weekEnd) return "week"
  return "upcoming"
}

const priorityRail: Record<string, string> = {
  urgent: "bg-rose-500",
  high: "bg-orange-400",
  medium: "bg-indigo-400",
  low: "bg-blue-300",
}

const priorityLabel: Record<string, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
}

const statusBadge: Record<string, string> = {
  open: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-100 text-blue-700",
  blocked: "bg-rose-100 text-rose-700",
  done: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-neutral-100 text-neutral-500",
}

const statusLabel: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  blocked: "Blocked",
  done: "Done",
  cancelled: "Cancelled",
}

// ─── sub-components ──────────────────────────────────────────────────────────

function DueDateChip({
  dueDate,
  group,
}: {
  dueDate?: string | Date | null
  group: Group
}) {
  const label = formatDate(dueDate)
  if (!label) return null
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        group === "overdue"
          ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
          : group === "today"
            ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
            : "bg-muted text-muted-foreground"
      )}>
      <Clock className="h-3 w-3" />
      {group === "overdue"
        ? `Overdue · ${label}`
        : group === "today"
          ? `Today`
          : label}
    </span>
  )
}

function ActionCard({
  item,
  group,
  onUpdated,
}: {
  item: ActionItemRecord
  group: Group
  onUpdated: () => Promise<void>
}) {
  return (
    <div className="group relative flex gap-3 rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md">
      {/* priority rail */}
      <div
        className={cn(
          "w-1 shrink-0 self-stretch rounded-l-xl",
          priorityRail[item.priority] ?? "bg-muted"
        )}
      />

      <div className="flex flex-1 flex-col gap-2 py-3 pr-4">
        {/* row 1: title + badges */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-sm font-semibold leading-snug">{item.title}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                statusBadge[item.status] ?? ""
              )}>
              {statusLabel[item.status] ?? item.status}
            </span>
            <span className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground">
              {priorityLabel[item.priority] ?? item.priority}
            </span>
          </div>
        </div>

        {/* row 2: description */}
        {item.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {item.description}
          </p>
        )}

        {/* row 3: meta row */}
        <div className="flex flex-wrap items-center gap-2">
          <DueDateChip dueDate={item.dueDate} group={group} />
          {item.meetingTitle && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {item.meetingTitle}
            </span>
          )}
          {item.notes && (
            <span className="inline-flex max-w-xs items-center gap-1 truncate text-xs text-muted-foreground">
              <span className="font-medium">Note:</span>
              {item.notes}
            </span>
          )}
        </div>

        {/* row 4: update button (only for non-done) */}
        {item.status !== "done" && item.status !== "cancelled" && (
          <div className="pt-0.5">
            <MemberActionItemDialog
              actionItem={item as unknown as ActionItem}
              onUpdated={onUpdated}
            />
          </div>
        )}

        {/* completed date */}
        {item.status === "done" && item.completedAt && (
          <p className="text-xs text-muted-foreground">
            Completed {formatDate(item.completedAt)}
          </p>
        )}
      </div>
    </div>
  )
}

function GroupSection({
  title,
  icon: Icon,
  iconClass,
  accent,
  items,
  group,
  onUpdated,
}: {
  title: string
  icon: LucideIcon
  iconClass: string
  accent: string
  items: ActionItemRecord[]
  group: Group
  onUpdated: () => Promise<void>
}) {
  if (items.length === 0) return null
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", iconClass)} />
        <h2
          className={cn("text-xs font-bold uppercase tracking-widest", accent)}>
          {title}
        </h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {items.length}
        </span>
      </div>

      {/* timeline line + cards */}
      <div className="relative space-y-2 pl-4">
        <div className="absolute left-0 top-2 h-[calc(100%-8px)] w-px bg-border" />
        {items.map((item) => (
          <ActionCard
            key={item.id}
            item={item}
            group={group}
            onUpdated={onUpdated}
          />
        ))}
      </div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed p-10 text-center">
      <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

// ─── main view ───────────────────────────────────────────────────────────────

type FilterTab = "all" | "active" | "blocked" | "done"

const statCards = [
  {
    key: "openCount" as const,
    label: "Open",
    icon: ClipboardList,
    iconClass: "text-amber-500",
    sub: "Awaiting action",
  },
  {
    key: "inProgressCount" as const,
    label: "In Progress",
    icon: CircleDot,
    iconClass: "text-blue-500",
    sub: "Being worked on",
  },
  {
    key: "blockedCount" as const,
    label: "Blocked",
    icon: AlertTriangle,
    iconClass: "text-rose-500",
    sub: "Needs attention",
  },
  {
    key: "doneCount" as const,
    label: "Completed",
    icon: CheckCircle2,
    iconClass: "text-emerald-500",
    sub: "Closed items",
  },
]

export function MemberActionsView() {
  const { data, isPending, isRefetching, error, refetch } = useActionItems({
    limit: 200,
  })
  const [filterTab, setFilterTab] = useState<FilterTab>("all")
  const [search, setSearch] = useState("")

  const actionItems = data?.data ?? []
  const isLoading = isPending && actionItems.length === 0

  const summary = (() => {
    const openCount = actionItems.filter((i) => i.status === "open").length
    const doneCount = actionItems.filter((i) => i.status === "done").length
    const inProgressCount = actionItems.filter(
      (i) => i.status === "in_progress"
    ).length
    const blockedCount = actionItems.filter(
      (i) => i.status === "blocked"
    ).length
    const total = actionItems.length
    const completionRate = total > 0 ? Math.round((doneCount / total) * 100) : 0
    const overdueCount = actionItems.filter((i) => {
      if (!i.dueDate || i.status === "done" || i.status === "cancelled")
        return false
      return (toDate(i.dueDate) ?? new Date()) < new Date()
    }).length
    return {
      openCount,
      doneCount,
      inProgressCount,
      blockedCount,
      total,
      completionRate,
      overdueCount,
    }
  })()

  // tab + search filter
  const visibleItems = (() => {
    let items = actionItems
    if (filterTab === "active")
      items = items.filter(
        (i) => i.status === "open" || i.status === "in_progress"
      )
    else if (filterTab === "blocked")
      items = items.filter((i) => i.status === "blocked")
    else if (filterTab === "done")
      items = items.filter(
        (i) => i.status === "done" || i.status === "cancelled"
      )

    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          (i.description ?? "").toLowerCase().includes(q) ||
          (i.meetingTitle ?? "").toLowerCase().includes(q) ||
          (i.notes ?? "").toLowerCase().includes(q)
      )
    }
    return items
  })()

  // group
  const grouped = (() => {
    const groups: Record<Group, ActionItemRecord[]> = {
      overdue: [],
      today: [],
      week: [],
      upcoming: [],
      no_date: [],
      done: [],
    }
    visibleItems.forEach((i) => groups[getGroup(i)].push(i))
    // sort each group by due date asc, no_date/done by updatedAt desc
    const byDue = (a: ActionItemRecord, b: ActionItemRecord) => {
      const da = toDate(a.dueDate)?.getTime() ?? 0
      const db = toDate(b.dueDate)?.getTime() ?? 0
      return da - db
    }
    groups.overdue.sort(byDue)
    groups.today.sort(byDue)
    groups.week.sort(byDue)
    groups.upcoming.sort(byDue)
    groups.done.sort((a, b) => {
      const da = toDate(a.completedAt)?.getTime() ?? 0
      const db = toDate(b.completedAt)?.getTime() ?? 0
      return db - da
    })
    return groups
  })()

  const doRefresh = async () => {
    await refetch()
  }
  const totalVisible = visibleItems.length

  return (
    <div className="flex-1 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">My Action Items</h1>
          <p className="text-sm text-muted-foreground">
            Tasks assigned to you from Ikimina meetings and group decisions.
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
              : "Failed to load action items"}
          </AlertDescription>
        </Alert>
      )}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(
          ({
            key,
            label,
            icon: Icon,
            iconClass,
            sub,
          }: (typeof statCards)[0]) =>
            isLoading ? (
              <Skeleton key={key} className="h-24 rounded-xl" />
            ) : (
              <Card key={key} className="rounded-xl">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{label}</span>
                    <Icon className={cn("h-4 w-4", iconClass)} />
                  </div>
                  <div
                    className={cn(
                      "mt-2 text-2xl font-semibold tabular-nums",
                      isRefetching && "opacity-60"
                    )}>
                    {summary[key]}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
                </CardContent>
              </Card>
            )
        )}
      </div>

      {/* Progress + notices */}
      {!isLoading && summary.total > 0 && (
        <Card className="rounded-xl">
          <CardContent className="space-y-3 pt-5">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1.5 font-medium">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                Overall Progress
              </div>
              <span className="tabular-nums text-muted-foreground">
                {summary.doneCount} / {summary.total} &mdash;{" "}
                {summary.completionRate}%
              </span>
            </div>
            <Progress value={summary.completionRate} className="h-2" />

            <div className="flex flex-wrap gap-2 pt-0.5">
              {summary.overdueCount > 0 ? (
                <div className="flex items-center gap-1.5 rounded-md bg-rose-50 px-3 py-1.5 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-400">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    <strong>{summary.overdueCount}</strong>{" "}
                    {summary.overdueCount === 1 ? "task is" : "tasks are"} past
                    due - update progress or flag blockers.
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  No overdue tasks - keep it up!
                </div>
              )}
              {summary.blockedCount > 0 && (
                <div className="flex items-center gap-1.5 rounded-md bg-amber-50 px-3 py-1.5 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                  <Zap className="h-3.5 w-3.5 shrink-0" />
                  <strong>{summary.blockedCount}</strong>&nbsp;
                  {summary.blockedCount === 1
                    ? "blocked task needs"
                    : "blocked tasks need"}{" "}
                  attention.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters: tabs + search */}
      {!isLoading && summary.total > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <Tabs
            value={filterTab}
            onValueChange={(v) => setFilterTab(v as FilterTab)}>
            <TabsList className="h-8">
              <TabsTrigger value="all" className="px-3 text-xs">
                All ({summary.total})
              </TabsTrigger>
              <TabsTrigger value="active" className="px-3 text-xs">
                Active ({summary.openCount + summary.inProgressCount})
              </TabsTrigger>
              <TabsTrigger value="blocked" className="px-3 text-xs">
                Blocked ({summary.blockedCount})
              </TabsTrigger>
              <TabsTrigger value="done" className="px-3 text-xs">
                Done ({summary.doneCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tasks, meetings, notes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-9 text-sm"
            />
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-24 rounded-xl" />
          ))}
        </div>
      )}

      {/* Timeline groups */}
      {!isLoading && (
        <div className="space-y-8">
          <GroupSection
            title="Overdue"
            icon={AlertTriangle}
            iconClass="text-rose-500"
            accent="text-rose-600"
            items={grouped.overdue}
            group="overdue"
            onUpdated={doRefresh}
          />
          <GroupSection
            title="Due Today"
            icon={Clock}
            iconClass="text-amber-500"
            accent="text-amber-600"
            items={grouped.today}
            group="today"
            onUpdated={doRefresh}
          />
          <GroupSection
            title="This Week"
            icon={Calendar}
            iconClass="text-blue-500"
            accent="text-blue-600"
            items={grouped.week}
            group="week"
            onUpdated={doRefresh}
          />
          <GroupSection
            title="Upcoming"
            icon={TrendingUp}
            iconClass="text-indigo-500"
            accent="text-indigo-600"
            items={grouped.upcoming}
            group="upcoming"
            onUpdated={doRefresh}
          />
          <GroupSection
            title="No Due Date"
            icon={ClipboardList}
            iconClass="text-muted-foreground"
            accent="text-muted-foreground"
            items={grouped.no_date}
            group="no_date"
            onUpdated={doRefresh}
          />
          <GroupSection
            title="Completed"
            icon={CheckCircle2}
            iconClass="text-emerald-500"
            accent="text-emerald-600"
            items={grouped.done}
            group="done"
            onUpdated={doRefresh}
          />

          {/* global empty state */}
          {totalVisible === 0 && !isLoading && (
            <EmptyState
              message={
                search
                  ? "No tasks match your search."
                  : filterTab !== "all"
                    ? "No tasks in this category."
                    : "You have no action items yet. They will appear here once assigned from a meeting."
              }
            />
          )}
        </div>
      )}
    </div>
  )
}
