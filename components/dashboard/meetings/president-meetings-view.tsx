"use client"

import { useMemo } from "react"
import { Calendar, MapPin, RefreshCcw, Users } from "lucide-react"

import { cn } from "@/lib/utils"
import { useMeetings, type MeetingRecord } from "@/hooks/api/use-meetings"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

const getStatusVariant = (status: MeetingRecord["status"]) => {
  if (status === "scheduled") return "default"
  if (status === "completed") return "secondary"
  return "outline"
}

const getStatusLabel = (status: MeetingRecord["status"]) => {
  if (status === "scheduled") return "Upcoming"
  if (status === "completed") return "Completed"
  return "Cancelled"
}

export function PresidentMeetingsView() {
  const { data, isPending, isRefetching, error, refetch } = useMeetings({
    limit: 200,
  })

  const meetings = data?.data ?? []
  const isLoading = isPending && meetings.length === 0

  const summary = useMemo(() => {
    const scheduled = meetings.filter((m) => m.status === "scheduled").length
    const completed = meetings.filter((m) => m.status === "completed").length
    const cancelled = meetings.filter((m) => m.status === "cancelled").length

    const upcoming = [...meetings]
      .filter((m) => m.status === "scheduled")
      .sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      )[0]

    return { total: meetings.length, scheduled, completed, cancelled, upcoming }
  }, [meetings])

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Meeting Chair</h1>
          <p className="text-sm text-muted-foreground">
            Preside over monthly meetings and ensure quorum and proper
            procedure.
          </p>
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
            {error.help ||
              error.message ||
              "Unable to load meetings right now."}
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Total Meetings
            </CardTitle>
            <Users className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div
                  className={cn(
                    "text-2xl font-semibold",
                    isRefetching && "opacity-80"
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
                    isRefetching && "opacity-80"
                  )}>
                  {summary.scheduled}
                </div>
                <p className="text-xs text-muted-foreground">
                  Upcoming meetings
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
                    isRefetching && "opacity-80"
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
                        { month: "short", day: "numeric", year: "numeric" }
                      )
                    : "TBD"}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {summary.upcoming?.title ?? "No upcoming meeting scheduled"}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Next Scheduled Meeting Detail */}
      {!isLoading && summary.upcoming ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Next Scheduled Meeting
            </CardTitle>
            <Badge
              variant="outline"
              className="border-purple-300 bg-purple-50 text-purple-700">
              Upcoming
            </Badge>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-start gap-2">
              <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-purple-500" />
              <div>
                <p className="text-muted-foreground">Date</p>
                <p className="font-medium">
                  {new Date(summary.upcoming.scheduledAt).toLocaleDateString(
                    "en-RW",
                    {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    }
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-purple-500" />
              <div>
                <p className="text-muted-foreground">Time</p>
                <p className="font-medium">
                  {new Date(summary.upcoming.scheduledAt).toLocaleTimeString(
                    "en-RW",
                    { hour: "2-digit", minute: "2-digit" }
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-purple-500" />
              <div>
                <p className="text-muted-foreground">Venue</p>
                <p className="font-medium">
                  {summary.upcoming.location ?? "Not specified"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-purple-500" />
              <div>
                <p className="text-muted-foreground">Host Contribution</p>
                <p className="font-medium">
                  {summary.upcoming.hostContribution
                    ? `${Number(summary.upcoming.hostContribution).toLocaleString()} RWF`
                    : "Not specified"}
                </p>
              </div>
            </div>
            {summary.upcoming.agenda ? (
              <div className="col-span-full text-muted-foreground">
                <span className="font-medium text-foreground">Agenda: </span>
                {summary.upcoming.agenda}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* Presidential Duties */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Presidential Duties at Meetings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <ul className="list-disc space-y-1 pl-4">
            <li>
              Call the meeting to order and confirm quorum (2/3 of members).
            </li>
            <li>Preside over discussions and ensure the agenda is followed.</li>
            <li>Cast a deciding vote in the event of a tie.</li>
            <li>
              Jointly authorize any financial transaction with the Treasurer.
            </li>
            <li>Sign off on official minutes after review by the Secretary.</li>
            <li>Declare meeting adjourned and confirm next meeting date.</li>
          </ul>
        </CardContent>
      </Card>

      {/* Meetings Archive */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Meetings Archive
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isRefetching ? (
            <div className="h-1.5 w-40 animate-pulse rounded-full bg-muted" />
          ) : null}

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : meetings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No meetings have been recorded yet.
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
                        {getStatusLabel(meeting.status)}
                      </Badge>
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <p>Location: {meeting.location ?? "Not specified"}</p>
                      <p>
                        Host Contribution:{" "}
                        {meeting.hostContribution
                          ? `${Number(meeting.hostContribution).toLocaleString()} RWF`
                          : "Not specified"}
                      </p>
                      {meeting.agenda ? <p>Agenda: {meeting.agenda}</p> : null}
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
