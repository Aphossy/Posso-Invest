"use client"

import { useMemo, useState } from "react"
import { Calendar, MapPin, RefreshCcw, Users } from "lucide-react"
import { toast } from "sonner"

import { ApiErrorException } from "@/types/api"
import { cn } from "@/lib/utils"
import {
  useCancelMeetingMutation,
  useMeetings,
  type MeetingRecord,
} from "@/hooks/api/use-meetings"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { EditMeetingTrigger } from "@/components/dashboard/meetings/edit-meeting-trigger"
import { RecordMeetingTrigger } from "@/components/dashboard/meetings/record-meeting-trigger"

const getStatusVariant = (status: MeetingRecord["status"]) => {
  if (status === "scheduled") return "default"
  if (status === "completed") return "secondary"
  return "outline"
}

export function SecretaryMeetingsView() {
  const [cancellingMeetingId, setCancellingMeetingId] = useState<string | null>(
    null
  )
  const { data, isPending, isRefetching, error, refetch } = useMeetings({
    limit: 200,
  })
  const cancelMeeting = useCancelMeetingMutation()

  const meetings = data?.data ?? []
  const isRefreshing = isRefetching

  const summary = useMemo(() => {
    const scheduled = meetings.filter(
      (item) => item.status === "scheduled"
    ).length
    const completed = meetings.filter(
      (item) => item.status === "completed"
    ).length
    const cancelled = meetings.filter(
      (item) => item.status === "cancelled"
    ).length

    const upcoming = [...meetings]
      .filter((item) => item.status === "scheduled")
      .sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      )[0]

    return {
      total: meetings.length,
      scheduled,
      completed,
      cancelled,
      upcoming,
    }
  }, [meetings])

  const handleRefresh = async () => {
    await refetch()
  }

  const handleCancelMeeting = async (meeting: MeetingRecord) => {
    const confirmed = window.confirm(
      `Cancel meeting "${meeting.title}"? This will set its status to cancelled.`
    )

    if (!confirmed) return

    setCancellingMeetingId(meeting.id)
    try {
      await cancelMeeting.mutateAsync({ id: meeting.id })
      toast.success("Meeting cancelled successfully")
      await handleRefresh()
    } catch (err) {
      const message =
        err instanceof ApiErrorException
          ? err.help || err.message
          : err instanceof Error
            ? err.message
            : "Unable to cancel meeting"
      toast.error(message)
    } finally {
      setCancellingMeetingId(null)
    }
  }

  const isLoading = isPending && meetings.length === 0

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Meetings</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage meetings so they can be selected when recording
            minutes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <RecordMeetingTrigger onSuccess={handleRefresh} />
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}>
            <RefreshCcw className="h-4 w-4" />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>
            {error.help ||
              error.message ||
              "Unable to load meetings right now."}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Total Meetings
            </CardTitle>
            <Users className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div
                  className={cn(
                    "text-2xl font-semibold",
                    isRefreshing && "opacity-80"
                  )}>
                  {summary.total}
                </div>
                <p className="text-xs text-muted-foreground">
                  All recorded meetings
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Calendar className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div
                  className={cn(
                    "text-2xl font-semibold",
                    isRefreshing && "opacity-80"
                  )}>
                  {summary.scheduled}
                </div>
                <p className="text-xs text-muted-foreground">
                  Available for new minutes
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Calendar className="h-4 w-4 text-sky-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div
                  className={cn(
                    "text-2xl font-semibold",
                    isRefreshing && "opacity-80"
                  )}>
                  {summary.completed}
                </div>
                <p className="text-xs text-muted-foreground">
                  Already held meetings
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Next Meeting</CardTitle>
            <MapPin className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <>
                <Skeleton className="h-7 w-32" />
                <Skeleton className="mt-2 h-3 w-40" />
              </>
            ) : (
              <>
                <div className="text-sm font-semibold">
                  {summary.upcoming
                    ? new Date(summary.upcoming.scheduledAt).toLocaleDateString(
                        "en-RW",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }
                      )
                    : "TBD"}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {summary.upcoming?.title || "No upcoming scheduled meeting"}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Meetings Archive
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isRefreshing ? (
            <div className="h-1.5 w-40 rounded-full bg-muted animate-pulse" />
          ) : null}

          {meetings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No meetings yet. Create one to make it selectable on the minutes
              form.
            </p>
          ) : (
            <div className="space-y-3">
              {[...meetings]
                .sort(
                  (a, b) =>
                    new Date(b.scheduledAt).getTime() -
                    new Date(a.scheduledAt).getTime()
                )
                .map((meeting) => (
                  <div
                    key={meeting.id}
                    className="rounded-lg border p-3 sm:p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{meeting.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(meeting.scheduledAt).toLocaleString(
                            "en-RW"
                          )}
                        </p>
                      </div>
                      <Badge variant={getStatusVariant(meeting.status)}>
                        {meeting.status}
                      </Badge>
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <p>Location: {meeting.location || "Not specified"}</p>
                      <p>
                        Host Contribution: {meeting.hostContribution || "10000"}{" "}
                        RWF
                      </p>
                      {meeting.agenda ? <p>Agenda: {meeting.agenda}</p> : null}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <EditMeetingTrigger
                        meeting={meeting}
                        onSuccess={handleRefresh}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={
                          meeting.status === "cancelled" ||
                          cancelMeeting.isPending ||
                          cancellingMeetingId === meeting.id
                        }
                        onClick={() => void handleCancelMeeting(meeting)}>
                        {cancellingMeetingId === meeting.id
                          ? "Cancelling..."
                          : meeting.status === "cancelled"
                            ? "Cancelled"
                            : "Cancel Meeting"}
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
