import { Metadata } from "next"

import { TreasurerLoanRepaymentsView } from "@/components/dashboard/loans/treasurer-loan-repayments-view"

export const metadata: Metadata = {
  title: "Loan Repayments",
  description: "Track and manage repayment progress for all active loans.",
}

export default async function LoansRepaymentsPage() {
  return <TreasurerLoanRepaymentsView />
}
