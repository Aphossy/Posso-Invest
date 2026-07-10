"use client"

import { useMemo } from "react"
import { CalendarDays, Clock3, Sparkles, Users } from "lucide-react"

import { useMeetings } from "@/hooks/api/use-meetings"
import { filterUpcomingActivities } from "@/utils/planned-activities"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlannedActivitiesCalendar } from "@/components/dashboard/common/planned-activities-calendar"

interface PlannedActivitiesPageProps {
  canManage?: boolean
  title?: string
  description?: string
}

export function PlannedActivitiesPage({
  canManage = false,
  title = "Planned activities",
  description = "Future activities scheduled by the secretary and visible to the whole team.",
}: PlannedActivitiesPageProps) {
  const { data, isPending } = useMeetings({ status: "scheduled", limit: 200 })

  const activities = useMemo(() => {
    const meetings = data?.data ?? []
    return filterUpcomingActivities(
      meetings.map((meeting) => ({
        id: meeting.id,
        title: meeting.title,
        scheduledAt: meeting.scheduledAt,
        status: meeting.status,
        location: meeting.location ?? null,
        agenda: meeting.agenda ?? null,
      }))
    )
  }, [data?.data])

  const nextThree = activities.slice(0, 3)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="rounded-lg border bg-background px-3 py-2 text-sm text-muted-foreground">
          {canManage
            ? "Only the secretary can add new planned activities."
            : "You can view all upcoming scheduled activities here."}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <CalendarDays className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{isPending ? "—" : activities.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">Scheduled for the future</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Next in line</CardTitle>
            <Clock3 className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {isPending || nextThree.length === 0 ? "—" : nextThree[0]?.title ?? "—"}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">First upcoming activity</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Shared with everyone</CardTitle>
            <Users className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">All roles</div>
            <p className="mt-1 text-xs text-muted-foreground">Secretary creates, teams view</p>
          </CardContent>
        </Card>
      </div>

      <PlannedActivitiesCalendar
        canManage={canManage}
        title="Calendar view"
        description="Browse planned activities by date and see what is coming next."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-violet-500" />
            Upcoming this week
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isPending ? (
            <p className="text-sm text-muted-foreground">Loading upcoming activities…</p>
          ) : nextThree.length === 0 ? (
            <p className="text-sm text-muted-foreground">No planned activities yet.</p>
          ) : (
            nextThree.map((activity) => (
              <div key={activity.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{activity.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(activity.scheduledAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="rounded-full border bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
                  {activity.location || "Open"}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
