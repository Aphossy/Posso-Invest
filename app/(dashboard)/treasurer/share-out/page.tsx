import { Metadata } from "next"

import { ShareOutManagementView } from "@/components/dashboard/share-out/share-out-management-view"

export const metadata: Metadata = {
  title: "Year-end Share-out",
  description: "Compute, approve, and distribute the group fund to members.",
}

export default async function TreasurerShareOutPage() {
  return <ShareOutManagementView />
}
