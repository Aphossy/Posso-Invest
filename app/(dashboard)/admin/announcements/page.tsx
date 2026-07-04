import { Metadata } from "next"

import { ManageAnnouncementsView } from "@/components/dashboard/announcements/manage-announcements-view"

export const metadata: Metadata = {
  title: "Announcements",
  description: "Manage and broadcast group announcements.",
}

export default function AdminAnnouncementsPage() {
  return <ManageAnnouncementsView role="admin" />
}
