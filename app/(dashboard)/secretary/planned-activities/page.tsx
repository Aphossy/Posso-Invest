import type { Metadata } from "next"

import { PlannedActivitiesPage } from "@/components/dashboard/planned-activities/planned-activities-page"

export const metadata: Metadata = {
  title: "Planned Activities",
  description: "View and manage planned activities for the organization.",
}

export default function SecretaryPlannedActivitiesPage() {
  return <PlannedActivitiesPage canManage />
}
