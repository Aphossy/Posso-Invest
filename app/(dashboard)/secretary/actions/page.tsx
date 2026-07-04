import { Metadata } from "next"

import { SecretaryActionsView } from "@/components/dashboard/action-items/secretary-actions-view"

export const metadata: Metadata = {
  title: "Actions",
  description: "Actions page for TrustLink Group.",
}

export default function ActionsPage() {
  return <SecretaryActionsView />
}
