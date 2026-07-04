import { Metadata } from "next"

import { PresidentActionsView } from "@/components/dashboard/action-items/president-actions-view"

export const metadata: Metadata = {
  title: "Action Items | President",
  description: "Follow up on committee decisions and open action items.",
}

export default function PresidentActionsPage() {
  return <PresidentActionsView />
}
