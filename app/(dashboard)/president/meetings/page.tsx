import { Metadata } from "next"

import { PresidentMeetingsView } from "@/components/dashboard/meetings/president-meetings-view"

export const metadata: Metadata = {
  title: "Meeting Chair | President",
  description: "Preside over and manage TrustLink Group meetings.",
}

export default function PresidentMeetingsPage() {
  return <PresidentMeetingsView />
}
