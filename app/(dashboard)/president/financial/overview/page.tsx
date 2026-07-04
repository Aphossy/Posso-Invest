import { Metadata } from "next"

import { PresidentFinancialOverviewView } from "@/components/dashboard/financial/president-financial-overview-view"

export const metadata: Metadata = {
  title: "Financial Overview | President",
  description: "Read-only summary of group savings, loans, and penalties.",
}

export default function PresidentFinancialOverviewPage() {
  return <PresidentFinancialOverviewView />
}
