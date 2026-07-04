import { Metadata } from "next"

import { UserLoansView } from "@/components/dashboard/loans/user-loans-view"

export const metadata: Metadata = {
  title: "Loan Requests",
  description: "Request loans and monitor repayment progress.",
}

export default async function UserLoansPage() {
  return <UserLoansView />
}
