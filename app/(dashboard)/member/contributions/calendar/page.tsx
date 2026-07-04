import { Metadata } from "next"

import { ContributionCalendarView } from "@/components/dashboard/contributions/contribution-calendar-view"

export const metadata: Metadata = {
  title: "Contributions Calendar",
  description:
    "Visual calendar view of your monthly contribution history and payment windows.",
}

export default function ContributionsCalendarPage() {
  return <ContributionCalendarView />
}
