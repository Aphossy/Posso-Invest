import { Metadata } from "next"

import { MemberAnnouncementsView } from "@/components/dashboard/announcements/member-announcements-view"

export const metadata: Metadata = {
  title: "Announcements",
  description: "Stay updated on group news, deadlines, and committee notices.",
}

export default function TreasurerAnnouncementsPage() {
  return <MemberAnnouncementsView role="treasurer" />
}
