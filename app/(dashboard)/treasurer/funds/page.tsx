import { Metadata } from "next"

import { FundTrackerView } from "@/components/dashboard/reports/fund-tracker-view"

export const metadata: Metadata = {
  title: "Fund Tracker",
  description:
    "Track total fund state: contributions, penalties, loans disbursed, and net balance.",
}

export default function FundTrackerPage() {
  return (
    <div className="flex-1 space-y-4 p-4">
      <FundTrackerView />
    </div>
  )
}
