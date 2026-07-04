import { Metadata } from "next"

import { TreasurerLoanRequestsView } from "@/components/dashboard/loans/treasurer-loan-requests-view"

export const metadata: Metadata = {
  title: "Loan Requests",
  description: "Review and approve member loan requests.",
}

export default async function TreasurerLoanRequestsPage() {
  return <TreasurerLoanRequestsView />
}
