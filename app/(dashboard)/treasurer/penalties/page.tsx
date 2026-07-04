import { Metadata } from "next"

import { TreasurerPenaltiesView } from "@/components/dashboard/penalties/treasurer-penalties-view"

export const metadata: Metadata = {
  title: "Late Penalties",
  description: "Track and manage late contribution penalties for all members.",
}

export default function ContributionsPenaltiesPage() {
  return <TreasurerPenaltiesView />
}
