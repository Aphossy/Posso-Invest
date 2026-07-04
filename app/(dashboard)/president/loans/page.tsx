import { Metadata } from "next"

import { PresidentLoanRequestsView } from "@/components/dashboard/loans/president-loan-requests-view"

export const metadata: Metadata = {
  title: "Loan Overview | President",
  description:
    "Full overview of all member loans - requests, disbursements, and repayments.",
}

export default function PresidentLoanRequestsPage() {
  return <PresidentLoanRequestsView />
}
