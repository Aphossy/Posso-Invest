import { Metadata } from "next"

import { ManageAnnouncementsView } from "@/components/dashboard/announcements/manage-announcements-view"

export const metadata: Metadata = {
  title: "Announcements",
  description: "Compose, publish, and manage group announcements.",
}

export default function PresidentAnnouncementsPage() {
  return <ManageAnnouncementsView role="president" />
}
