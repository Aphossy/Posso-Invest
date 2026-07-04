import { Metadata } from "next"

import { MonthlyReportView } from "@/components/dashboard/reports/monthly-report-view"

export const metadata: Metadata = {
  title: "Monthly Report",
  description:
    "Full financial summary of contributions, loans, and meetings for any selected month.",
}

export default function ReportsMonthlyPage() {
  return <MonthlyReportView />
}
