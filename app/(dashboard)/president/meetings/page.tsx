import { Metadata } from "next"

import { PresidentMeetingsView } from "@/components/dashboard/meetings/president-meetings-view"

export const metadata: Metadata = {
  title: "Meeting Chair | President",
  description: "Preside over and manage 10/10 Ventures meetings.",
}

export default function PresidentMeetingsPage() {
  return <PresidentMeetingsView />
}
