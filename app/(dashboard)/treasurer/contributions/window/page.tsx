import { Metadata } from "next"

import { TreasurerContributionWindowView } from "@/components/dashboard/contributions/treasurer-contribution-window-view"

export const metadata: Metadata = {
  title: "Contribution Window",
  description:
    "Monitor member payment activity within each monthly contribution window.",
}

export default function TreasurerContributionWindowPage() {
  return <TreasurerContributionWindowView />
}
