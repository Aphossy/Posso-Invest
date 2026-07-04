import { Metadata } from "next"

import { MemberActionsView } from "@/components/dashboard/action-items/member-actions-view"

export const metadata: Metadata = {
  title: "My Action Items",
  description: "Track your assigned action items and deadlines.",
}

export default function UserActionItemsPage() {
  return <MemberActionsView />
}
