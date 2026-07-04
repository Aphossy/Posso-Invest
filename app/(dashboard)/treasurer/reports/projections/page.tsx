import { Metadata } from "next"

import { ProjectionsView } from "@/components/dashboard/reports/projections-view"

export const metadata: Metadata = {
  title: "Financial Projections",
  description:
    "Forward-looking fund estimates, loan interest forecasts, and member compliance risk for the treasurer.",
}

export default function ReportsProjectionsPage() {
  return <ProjectionsView />
}
