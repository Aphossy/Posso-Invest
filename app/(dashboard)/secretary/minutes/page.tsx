"use client"

import { useMemo } from "react"

import { useMeetings } from "@/hooks/api/use-meetings"
import { SecretaryMinutesView } from "@/components/dashboard/minutes/secretary-minutes-view"

export default function SecretaryMinutesPage() {
  const { data: meetingsData } = useMeetings({ limit: 200 })

  const nextMeeting = useMemo(() => {
    const meetings = meetingsData?.data ?? []
    const scheduledMeetings = meetings.filter((m) => m.status === "scheduled")

    if (scheduledMeetings.length === 0) return null

    return [...scheduledMeetings].sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    )[0].scheduledAt
  }, [meetingsData?.data])

  return (
    <SecretaryMinutesView
      nextMeetingDate={nextMeeting ? new Date(nextMeeting) : null}
    />
  )
}
