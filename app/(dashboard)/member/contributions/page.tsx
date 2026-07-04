import { Metadata } from "next"

import { UserContributionsView } from "@/components/dashboard/contributions/user-contributions-view"

export const metadata: Metadata = {
  title: "My Contributions",
  description: "Track monthly savings and contribution receipts.",
}

export default async function UserContributionsPage() {
  return <UserContributionsView />
}
