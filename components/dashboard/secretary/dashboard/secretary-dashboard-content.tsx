"use client"

import { useEffect, useState } from "react"
import type { Route } from "next"
import Link from "next/link"
import {
  AlertCircle,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock,
  FileText,
  Mail,
  MessageSquare,
  ScrollText,
  Users,
  X,
  XCircle,
  Zap,
  type LucideIcon,
} from "lucide-react"

import { getDynamicGreeting } from "@/lib/greeting"
import {
  useSecretaryDashboard,
  type ActionItemEntry,
} from "@/hooks/api/use-secretary-dashboard"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// ── helpers ──────────────────────────────────────────────────────────────────

function formatDate(value?: string | null) {
  if (!value) return "-"
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatDateTime(value?: string | null) {
  if (!value) return "-"
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const statusColorMap: Record<string, string> = {
  open: "text-blue-600 bg-blue-50 border-blue-200",
  in_progress: "text-indigo-600 bg-indigo-50 border-indigo-200",
  blocked: "text-red-600 bg-red-50 border-red-200",
  done: "text-emerald-600 bg-emerald-50 border-emerald-200",
  cancelled: "text-slate-500 bg-slate-50 border-slate-200",
  draft: "text-amber-600 bg-amber-50 border-amber-200",
  finalized: "text-blue-600 bg-blue-50 border-blue-200",
  published: "text-emerald-600 bg-emerald-50 border-emerald-200",
  scheduled: "text-cyan-600 bg-cyan-50 border-cyan-200",
  completed: "text-emerald-600 bg-emerald-50 border-emerald-200",
  sent: "text-indigo-600 bg-indigo-50 border-indigo-200",
  new: "text-blue-600 bg-blue-50 border-blue-200",
  read: "text-slate-600 bg-slate-50 border-slate-200",
  resolved: "text-emerald-600 bg-emerald-50 border-emerald-200",
  members: "text-cyan-600 bg-cyan-50 border-cyan-200",
  committee: "text-indigo-600 bg-indigo-50 border-indigo-200",
  public: "text-slate-600 bg-slate-50 border-slate-200",
}

function Chip({ label, colorKey }: { label: string; colorKey: string }) {
  const classes =
    statusColorMap[colorKey] ?? "text-slate-600 bg-slate-50 border-slate-200"
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${classes}`}>
      {label.replace(/_/g, " ")}
    </span>
  )
}

function PriorityDot({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    urgent: "bg-red-500",
    high: "bg-orange-400",
    medium: "bg-amber-400",
    low: "bg-slate-300",
  }
  return (
    <span
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${colors[priority] ?? "bg-slate-300"}`}
    />
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  iconColor = "text-muted-foreground",
  href,
  alert,
}: {
  title: string
  value: string | number
  icon: LucideIcon
  description?: string
  iconColor?: string
  href?: Route
  alert?: boolean
}) {
  const inner = (
    <Card
      className={`${href ? "transition-colors hover:border-primary/60" : ""} ${alert ? "border-amber-300 bg-amber-50/30" : ""}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  )
  if (href) return <Link href={href}>{inner}</Link>
  return inner
}

function ActionItemRow({ item }: { item: ActionItemEntry }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border p-3">
      <PriorityDot priority={item.priority} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.title}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {item.ownerName && <span>{item.ownerName}</span>}
          {item.dueDate && (
            <span
              className={
                new Date(item.dueDate) < new Date()
                  ? "text-red-500 font-medium"
                  : ""
              }>
              Due {formatDate(item.dueDate)}
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Chip label={item.priority} colorKey={item.priority} />
      </div>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export function SecretaryDashboardContent() {
  const [mounted, setMounted] = useState(false)
  const [greeting, setGreeting] = useState("Welcome Back")
  const [isBlockedAlertVisible, setIsBlockedAlertVisible] = useState(true)
  const [isBlockedAlertCollapsed, setIsBlockedAlertCollapsed] = useState(false)
  const [isDueSoonAlertVisible, setIsDueSoonAlertVisible] = useState(true)
  const [isDueSoonAlertCollapsed, setIsDueSoonAlertCollapsed] = useState(false)
  const { data, isLoading, error, refetch } = useSecretaryDashboard()

  useEffect(() => {
    setMounted(true)
    setGreeting(getDynamicGreeting())
  }, [])

  const blockedActionItemsCount = data?.data.stats.actionItems.blocked ?? 0
  const dueSoonActionItemsCount = data?.data.stats.actionItems.dueSoon ?? 0

  useEffect(() => {
    if (!blockedActionItemsCount) return
    setIsBlockedAlertVisible(true)
    setIsBlockedAlertCollapsed(false)
  }, [blockedActionItemsCount])

  useEffect(() => {
    if (!dueSoonActionItemsCount) return
    setIsDueSoonAlertVisible(true)
    setIsDueSoonAlertCollapsed(false)
  }, [dueSoonActionItemsCount])

  if (!mounted) return <SecretaryDashboardSkeleton />

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load secretary dashboard data.{" "}
          <button
            onClick={() => refetch()}
            className="underline hover:no-underline">
            Retry
          </button>
        </AlertDescription>
      </Alert>
    )
  }

  if (isLoading || !data) return <SecretaryDashboardSkeleton />

  const {
    secretary,
    stats,
    meetings,
    minutes,
    actionItems,
    announcements,
    letters,
    messages,
  } = data.data

  const firstName = secretary.name?.trim().split(/\s+/)[0] ?? secretary.email
  const totalActiveActions =
    stats.actionItems.open +
    stats.actionItems.inProgress +
    stats.actionItems.blocked

  return (
    <Tabs defaultValue="overview" className="space-y-4 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {greeting}, {firstName}!
          </h2>
          <p className="text-muted-foreground">
            Meeting operations &amp; governance for TrustLink Group.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {stats.meetings.nextMeeting && (
            <Badge variant="default">
              Next:{" "}
              {new Date(stats.meetings.nextMeeting).toLocaleDateString(
                undefined,
                { month: "short", day: "numeric" }
              )}
            </Badge>
          )}
          {stats.actionItems.blocked > 0 && (
            <Badge variant="destructive">
              {stats.actionItems.blocked} blocked
            </Badge>
          )}
          {stats.minutes.draft > 0 && (
            <Badge variant="outline">
              {stats.minutes.draft} minutes draft
              {stats.minutes.draft > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </div>

      {/* Urgent alerts */}
      {blockedActionItemsCount > 0 && isBlockedAlertVisible && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-tight">
                {blockedActionItemsCount} action{" "}
                {blockedActionItemsCount === 1 ? "item is" : "items are"}{" "}
                blocked
              </p>
              {!isBlockedAlertCollapsed && (
                <AlertDescription className="mt-1">
                  These items need attention before progress can continue.{" "}
                  <Link href="/secretary/actions" className="underline">
                    Review blocked items
                  </Link>
                </AlertDescription>
              )}
            </div>
            <div className="flex items-center gap-1 self-start">
              <button
                type="button"
                onClick={() =>
                  setIsBlockedAlertCollapsed((current) => !current)
                }
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground"
                aria-label={
                  isBlockedAlertCollapsed
                    ? "Expand blocked items alert"
                    : "Collapse blocked items alert"
                }>
                {isBlockedAlertCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsBlockedAlertVisible(false)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground"
                aria-label="Close blocked items alert">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Alert>
      )}

      {dueSoonActionItemsCount > 0 && isDueSoonAlertVisible && (
        <Alert variant="warning">
          <Clock className="h-4 w-4" />
          <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-tight">
                {dueSoonActionItemsCount} action{" "}
                {dueSoonActionItemsCount === 1 ? "item is" : "items are"} due
                within 7 days
              </p>
              {!isDueSoonAlertCollapsed && (
                <AlertDescription className="mt-1">
                  Prioritize these tasks to avoid missed governance deadlines.{" "}
                  <Link href="/secretary/actions" className="underline">
                    View due soon
                  </Link>
                </AlertDescription>
              )}
            </div>
            <div className="flex items-center gap-1 self-start">
              <button
                type="button"
                onClick={() =>
                  setIsDueSoonAlertCollapsed((current) => !current)
                }
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground"
                aria-label={
                  isDueSoonAlertCollapsed
                    ? "Expand due soon alert"
                    : "Collapse due soon alert"
                }>
                {isDueSoonAlertCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsDueSoonAlertVisible(false)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground"
                aria-label="Close due soon alert">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Alert>
      )}

      {/* Quick actions */}
      <div className="hidden sm:flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href="/secretary/minutes">Capture Minutes</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/secretary/announcements">Post Announcement</Link>
        </Button>
        <Button asChild size="sm" variant="default">
          <Link href="/secretary/meetings">Schedule Meeting</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/secretary/actions">Manage Actions</Link>
        </Button>
      </div>

      <TabsList className="overflow-x-hidden">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="meetings">Meetings &amp; Minutes</TabsTrigger>
        <TabsTrigger value="actions">Action Items</TabsTrigger>
        <TabsTrigger value="comms">Communications</TabsTrigger>
      </TabsList>

      {/* ─── OVERVIEW TAB ─── */}
      <TabsContent value="overview" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Next meeting"
            value={
              stats.meetings.nextMeeting
                ? new Date(stats.meetings.nextMeeting).toLocaleDateString(
                    undefined,
                    { month: "short", day: "numeric" }
                  )
                : "TBD"
            }
            icon={CalendarDays}
            iconColor="text-cyan-500"
            description={
              stats.meetings.nextMeetingTitle ??
              `${stats.meetings.upcoming} scheduled`
            }
            href="/secretary/meetings"
          />
          <StatCard
            title="Minutes drafts"
            value={stats.minutes.draft}
            icon={ClipboardList}
            iconColor={
              stats.minutes.draft > 0 ? "text-amber-500" : "text-slate-400"
            }
            description={`${stats.minutes.finalized} finalized · ${stats.minutes.published} published`}
            alert={stats.minutes.draft > 0}
            href="/secretary/minutes"
          />
          <StatCard
            title="Open action items"
            value={totalActiveActions}
            icon={CheckCircle2}
            iconColor={
              stats.actionItems.blocked > 0 ? "text-red-500" : "text-indigo-500"
            }
            description={`${stats.actionItems.dueSoon} due this week · ${stats.actionItems.blocked} blocked`}
            href="/secretary/actions"
          />
          <StatCard
            title="Unread messages"
            value={stats.communications.unreadMessages}
            icon={Mail}
            iconColor={
              stats.communications.unreadMessages > 0
                ? "text-blue-500"
                : "text-slate-400"
            }
            description={`${stats.communications.draftAnnouncements} announcement drafts`}
            href="/secretary/messages"
          />
        </div>

        {/* Attendance + next meeting details */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                Next meeting &amp; last attendance
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border bg-background p-4 space-y-1.5">
                <p className="text-xs uppercase text-muted-foreground tracking-wide">
                  Next meeting
                </p>
                {meetings.upcoming[0] ? (
                  <>
                    <p className="text-lg font-semibold">
                      {meetings.upcoming[0].title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(meetings.upcoming[0].scheduledAt)}
                    </p>
                    {meetings.upcoming[0].location && (
                      <p className="text-xs text-muted-foreground">
                        {meetings.upcoming[0].location}
                      </p>
                    )}
                    {meetings.upcoming[0].agenda && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {meetings.upcoming[0].agenda}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No meeting scheduled
                  </p>
                )}
              </div>

              <div className="rounded-lg border bg-background p-4 space-y-2">
                <p className="text-xs uppercase text-muted-foreground tracking-wide">
                  Last meeting attendance
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tabular-nums">
                    {stats.attendance.lastMeetingRate}%
                  </span>
                  <span className="text-sm text-muted-foreground">rate</span>
                </div>
                <Progress
                  value={stats.attendance.lastMeetingRate}
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground">
                  {stats.attendance.lastMeetingPresent} present of{" "}
                  {stats.attendance.lastMeetingTotal > 0
                    ? stats.attendance.lastMeetingTotal
                    : stats.attendance.membershipCount}{" "}
                  members
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Minutes status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScrollText className="h-4 w-4 text-muted-foreground" />
                Minutes status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                {
                  label: "Draft",
                  count: stats.minutes.draft,
                  color: "bg-amber-400",
                  colorKey: "draft",
                },
                {
                  label: "Finalized",
                  count: stats.minutes.finalized,
                  color: "bg-blue-400",
                  colorKey: "finalized",
                },
                {
                  label: "Published",
                  count: stats.minutes.published,
                  color: "bg-emerald-500",
                  colorKey: "published",
                },
              ].map((item) => {
                const total = Math.max(stats.minutes.total, 1)
                return (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Chip label={item.label} colorKey={item.colorKey} />
                      </div>
                      <span className="font-semibold tabular-nums">
                        {item.count}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className={`h-2 rounded-full ${item.color}`}
                        style={{
                          width: `${Math.min((item.count / total) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
              <Button asChild variant="ghost" size="sm" className="w-full mt-1">
                <Link href="/secretary/minutes">Manage minutes</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Due-soon action items + draft announcements */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Action items due this week
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {actionItems.dueSoon.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  No action items due in the next 7 days.
                </div>
              ) : (
                actionItems.dueSoon.map((item) => (
                  <ActionItemRow key={item.id} item={item} />
                ))
              )}
              <Button asChild variant="ghost" size="sm" className="w-full mt-1">
                <Link href="/secretary/actions">View all action items</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                Announcement drafts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {announcements.drafts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No announcement drafts pending.
                </p>
              ) : (
                announcements.drafts.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50/40 p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{a.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Updated {formatDate(a.updatedAt)}
                      </p>
                    </div>
                    <Chip label={a.audience} colorKey={a.audience} />
                  </div>
                ))
              )}
              <Button asChild variant="ghost" size="sm" className="w-full mt-1">
                <Link href="/secretary/announcements">
                  Manage announcements
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick nav */}
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              href: "/secretary/attendance",
              label: "Attendance",
              desc: "Record and review meeting attendance",
              icon: Users,
              color: "text-sky-500",
            },
            {
              href: "/secretary/members",
              label: "Members",
              desc: "View membership register",
              icon: Users,
              color: "text-indigo-500",
            },
            {
              href: "/secretary/documents/letters",
              label: "Letters",
              desc: "Draft and manage official correspondence",
              icon: FileText,
              color: "text-slate-500",
            },
          ].map((item) => (
            <Link key={item.href} href={item.href as Route} className="group">
              <Card className="transition-colors group-hover:border-primary/60">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-medium">
                    {item.label}
                  </CardTitle>
                  <item.icon className={`h-4 w-4 ${item.color}`} />
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </TabsContent>

      {/* ─── MEETINGS & MINUTES TAB ─── */}
      <TabsContent value="meetings" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Upcoming"
            value={stats.meetings.upcoming}
            icon={CalendarDays}
            iconColor="text-cyan-500"
            description="Scheduled meetings"
          />
          <StatCard
            title="Completed"
            value={stats.meetings.completed}
            icon={CheckCircle2}
            iconColor="text-emerald-500"
            description="All-time"
          />
          <StatCard
            title="Last attendance"
            value={`${stats.attendance.lastMeetingRate}%`}
            icon={Users}
            iconColor="text-indigo-500"
            description={`${stats.attendance.lastMeetingPresent} of ${stats.attendance.lastMeetingTotal || stats.attendance.membershipCount} members`}
          />
          <StatCard
            title="Minutes to finalize"
            value={stats.minutes.draft + stats.minutes.finalized}
            icon={ClipboardList}
            iconColor={
              stats.minutes.draft > 0 ? "text-amber-500" : "text-slate-400"
            }
            description={`${stats.minutes.draft} draft · ${stats.minutes.finalized} finalized`}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming meetings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {meetings.upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No meetings scheduled.
                </p>
              ) : (
                meetings.upcoming.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-lg border bg-background p-3 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm">{m.title}</p>
                      <Chip label={m.status} colorKey={m.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(m.scheduledAt)}
                    </p>
                    {m.location && (
                      <p className="text-xs text-muted-foreground">
                        {m.location}
                      </p>
                    )}
                    {m.agenda && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2 border-t pt-1">
                        {m.agenda}
                      </p>
                    )}
                  </div>
                ))
              )}
              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link href="/secretary/meetings">All meetings</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent minutes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {minutes.recent.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No minutes recorded yet.
                </p>
              ) : (
                minutes.recent.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-start justify-between gap-3 rounded-lg border p-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Chip label={m.status} colorKey={m.status} />
                      </div>
                      {m.summary && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {m.summary}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        Updated {formatDate(m.updatedAt)}
                        {m.publishedAt &&
                          ` · Published ${formatDate(m.publishedAt)}`}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link href="/secretary/minutes">Manage minutes</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent completed meetings */}
        {meetings.recent.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent completed meetings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {meetings.recent.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-lg border p-3">
                  <p className="text-sm font-medium">{m.title}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(m.scheduledAt)}
                    </span>
                    <Chip label={m.status} colorKey={m.status} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* ─── ACTION ITEMS TAB ─── */}
      <TabsContent value="actions" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Open"
            value={stats.actionItems.open}
            icon={AlertCircle}
            iconColor="text-blue-500"
            description="Not yet started"
          />
          <StatCard
            title="In progress"
            value={stats.actionItems.inProgress}
            icon={Clock}
            iconColor="text-indigo-500"
            description="Being worked on"
          />
          <StatCard
            title="Blocked"
            value={stats.actionItems.blocked}
            icon={XCircle}
            iconColor={
              stats.actionItems.blocked > 0 ? "text-red-500" : "text-slate-400"
            }
            description="Need resolution"
            alert={stats.actionItems.blocked > 0}
          />
          <StatCard
            title="Completed"
            value={stats.actionItems.done}
            icon={CheckCircle2}
            iconColor="text-emerald-500"
            description="All-time done"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Open */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-blue-500" />
                Open items
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {actionItems.open.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No open action items.
                </p>
              ) : (
                actionItems.open.map((item) => (
                  <ActionItemRow key={item.id} item={item} />
                ))
              )}
              <Button asChild variant="ghost" size="sm" className="w-full mt-1">
                <Link href="/secretary/actions">View all</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Blocked + In-progress */}
          <div className="flex flex-col gap-4">
            {actionItems.blocked.length > 0 && (
              <Card className="border-red-200/60">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <XCircle className="h-4 w-4" />
                    Blocked
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {actionItems.blocked.map((item) => (
                    <ActionItemRow key={item.id} item={item} />
                  ))}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-indigo-500" />
                  In progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {actionItems.inProgress.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No items in progress.
                  </p>
                ) : (
                  actionItems.inProgress.map((item) => (
                    <ActionItemRow key={item.id} item={item} />
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recently completed */}
        {actionItems.recentlyDone.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Recently completed
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {actionItems.recentlyDone.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/40 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    {item.ownerName && (
                      <p className="text-xs text-muted-foreground">
                        {item.ownerName}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.completedAt && (
                      <span className="text-xs text-muted-foreground">
                        {formatDate(item.completedAt)}
                      </span>
                    )}
                    <Chip label="done" colorKey="done" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* ─── COMMUNICATIONS TAB ─── */}
      <TabsContent value="comms" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Unread messages"
            value={stats.communications.unreadMessages}
            icon={MessageSquare}
            iconColor={
              stats.communications.unreadMessages > 0
                ? "text-blue-500"
                : "text-slate-400"
            }
            description="Member requests"
            alert={stats.communications.unreadMessages > 0}
            href="/secretary/messages"
          />
          <StatCard
            title="Draft announcements"
            value={stats.communications.draftAnnouncements}
            icon={Bell}
            iconColor={
              stats.communications.draftAnnouncements > 0
                ? "text-amber-500"
                : "text-slate-400"
            }
            description="Ready to publish"
            href="/secretary/announcements"
          />
          <StatCard
            title="Letters drafted"
            value={stats.communications.draftLetters}
            icon={FileText}
            iconColor={
              stats.communications.draftLetters > 0
                ? "text-indigo-500"
                : "text-slate-400"
            }
            description={`${stats.communications.sentLetters} sent`}
            href="/secretary/documents/letters"
          />
          <StatCard
            title="Letters sent"
            value={stats.communications.sentLetters}
            icon={Mail}
            iconColor="text-emerald-500"
            description="Official correspondence"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Announcements */}
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-amber-500" />
                  Announcement drafts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {announcements.drafts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No drafts pending.
                  </p>
                ) : (
                  announcements.drafts.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-start justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50/40 p-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {a.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Updated {formatDate(a.updatedAt)}
                        </p>
                      </div>
                      <Chip label={a.audience} colorKey={a.audience} />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-emerald-500" />
                  Recent published
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {announcements.recentPublished.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No published announcements.
                  </p>
                ) : (
                  announcements.recentPublished.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-start justify-between gap-2 rounded-lg border p-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate">
                            {a.title}
                          </p>
                          {a.pinned && (
                            <Badge
                              variant="secondary"
                              className="shrink-0 text-[10px]">
                              Pinned
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(a.publishedAt)}
                        </p>
                      </div>
                      <Chip label={a.audience} colorKey={a.audience} />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Letters + Messages */}
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Recent letters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {letters.recent.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No letters yet.
                  </p>
                ) : (
                  letters.recent.map((l) => (
                    <div
                      key={l.id}
                      className="flex items-start justify-between gap-2 rounded-lg border p-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {l.subject}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {l.recipient && `To: ${l.recipient} · `}
                          {l.refNumber && `${l.refNumber} · `}
                          {formatDate(l.createdAt)}
                        </p>
                      </div>
                      <Chip label={l.status} colorKey={l.status} />
                    </div>
                  ))
                )}
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="w-full mt-1">
                  <Link href="/secretary/documents/letters">All letters</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  Recent messages
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {messages.recent.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No messages yet.
                  </p>
                ) : (
                  messages.recent.map((m) => (
                    <div
                      key={m.id}
                      className={`flex items-start justify-between gap-2 rounded-lg border p-3 ${!m.isRead ? "border-blue-200 bg-blue-50/30" : ""}`}>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {m.subject}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {m.name && `${m.name} · `}
                          {formatDate(m.createdAt)}
                        </p>
                      </div>
                      <Chip label={m.status} colorKey={m.status} />
                    </div>
                  ))
                )}
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="w-full mt-1">
                  <Link href="/secretary/messages">All messages</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  )
}

// ── skeleton ──────────────────────────────────────────────────────────────────

function SecretaryDashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
              <Skeleton className="mt-2 h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-8" />
                </div>
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
