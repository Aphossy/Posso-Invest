import { Metadata } from "next"

import { TreasurerLoanDisbursementsView } from "@/components/dashboard/loans/treasurer-loan-disbursements-view"

export const metadata: Metadata = {
  title: "Loan Disbursements",
  description: "Review approved loans and record fund transfers to members.",
}

export default async function LoansDisbursementsPage() {
  return <TreasurerLoanDisbursementsView />
}
