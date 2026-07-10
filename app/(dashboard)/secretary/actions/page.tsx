import { Metadata } from "next"

import { SecretaryActionsView } from "@/components/dashboard/action-items/secretary-actions-view"

export const metadata: Metadata = {
  title: "Actions",
  description: "Actions page for 10/10 Ventures.",
}

export default function ActionsPage() {
  return <SecretaryActionsView />
}
