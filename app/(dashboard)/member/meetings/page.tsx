import { Metadata } from "next"
import { headers } from "next/headers"
import Link from "next/link"
import { Calendar, MapPin, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Meeting Schedule",
  description: "Review upcoming TrustLink Group meetings and venues.",
}

type ApiListResponse<T> = { data: T[]; total?: number }

async function fetchWithAuth<T>(url: string): Promise<T | null> {
  const headersList = await headers()
  const cookie = headersList.get("cookie")
  const host = headersList.get("host") ?? "localhost:3000"
  const protocol = headersList.get("x-forwarded-proto") ?? "http"
  const absoluteUrl = url.startsWith("http")
    ? url
    : `${protocol}://${host}${url}`
  const res = await fetch(absoluteUrl, {
    cache: "no-store",
    headers: cookie ? { cookie } : undefined,
  })
  if (!res.ok) return null
  return res.json()
}

export default async function UserMeetingsPage() {
  const meetingsRes = await fetchWithAuth<
    ApiListResponse<{ scheduledAt: string; location?: string; agenda?: string }>
  >("/api/meetings?status=scheduled&limit=5")

  const sortedMeetings = meetingsRes?.data
    ?.map((meeting) => ({
      ...meeting,
      date: new Date(meeting.scheduledAt),
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  const nextMeeting = sortedMeetings?.[0]

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Meeting Schedule</h1>
          <p className="text-sm text-muted-foreground">
            Stay informed about upcoming meetings and hosting logistics.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/member/minutes">
            <Button>View Minutes</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Next Meeting</CardTitle>
            <Calendar className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {nextMeeting
                ? nextMeeting.date.toLocaleDateString("en-RW", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "TBD"}
            </div>
            <p className="text-xs text-muted-foreground">
              {nextMeeting?.agenda || "Agenda to be announced"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Hosting Fund</CardTitle>
            <Users className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              10,000&nbsp;RWF
            </div>
            <p className="text-xs text-muted-foreground">Per meeting</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Venue</CardTitle>
            <MapPin className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {nextMeeting?.location || "Rotating"}
            </div>
            <p className="text-xs text-muted-foreground">Rotating locations</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Upcoming Meetings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          {sortedMeetings?.length ? (
            sortedMeetings.map((meeting) => (
              <div
                key={meeting.scheduledAt}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2">
                <div>
                  <div className="font-medium text-foreground">
                    {meeting.date.toLocaleDateString("en-RW", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {meeting.agenda || "Agenda to be announced"}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {meeting.location || "TBD"}
                </div>
              </div>
            ))
          ) : (
            <p>No meetings scheduled yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
