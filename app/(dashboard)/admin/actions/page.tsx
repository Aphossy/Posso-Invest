import { Metadata } from "next"

import { AdminActionsView } from "@/components/dashboard/action-items/admin-actions-view"

export const metadata: Metadata = {
  title: "Action Items",
  description: "Track action items and accountability for Posso Ventures.",
}

export default function AdminActionsPage() {
  return <AdminActionsView />
}
