import { Metadata } from "next"

import { UserLoansView } from "@/components/dashboard/loans/user-loans-view"

export const metadata: Metadata = {
  title: "Loan Records",
  description: "Review existing loan records.",
}

export default async function UserLoansPage() {
  return <UserLoansView />
}
