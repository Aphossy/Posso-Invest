import type { Metadata } from "next"

import { AdminSupportView } from "@/components/dashboard/support/admin-support-view"

export const metadata: Metadata = {
  title: "Support Messages",
  description: "Manage member support tickets and respond to inquiries",
}

export default function AdminMessagesPage() {
  return <AdminSupportView />
}
