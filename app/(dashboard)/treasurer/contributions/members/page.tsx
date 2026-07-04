import { Metadata } from "next"

import { TreasurerContributionsView } from "@/components/dashboard/contributions/treasurer-contributions-view"

export const metadata: Metadata = {
  title: "Contributions",
  description: "Record and verify member contributions.",
}

export default function TreasurerContributionsPage() {
  return <TreasurerContributionsView />
}
