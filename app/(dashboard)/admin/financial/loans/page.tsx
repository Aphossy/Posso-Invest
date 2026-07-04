import { Metadata } from "next"

import { AdminFinancialLoansView } from "@/components/dashboard/loans/admin-financial-loans-view"

export const metadata: Metadata = {
  title: "Financial Loans",
  description: "Oversee loan requests, approvals, and portfolio health.",
}

export default async function AdminFinancialLoansPage() {
  return <AdminFinancialLoansView />
}
