import { Metadata } from "next"

import { TreasurerExpensesView } from "@/components/dashboard/expenses/treasurer-expenses-view"

export const metadata: Metadata = {
  title: "Operational Expenses",
  description: "Review and approve operational expense submissions.",
}

export default function TreasurerExpensesPage() {
  return (
    <div className="flex-1 space-y-4 p-4">
      <TreasurerExpensesView />
    </div>
  )
}
