import { Metadata } from "next"

import { PresidentPenaltiesView } from "@/components/dashboard/penalties/president-penalties-view"

export const metadata: Metadata = {
  title: "Penalties Management | President",
  description: "Group-wide oversight and management of late payment penalties.",
}

export default function PresidentPenaltiesPage() {
  return <PresidentPenaltiesView />
}
