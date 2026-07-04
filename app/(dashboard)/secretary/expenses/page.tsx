import { Metadata } from "next"

import { MyExpensesView } from "@/components/dashboard/expenses/my-expenses-view"

export const metadata: Metadata = {
  title: "My Expenses",
  description: "Submit and track operational expenses for treasurer approval.",
}

export default function SecretaryExpensesPage() {
  return (
    <div className="flex-1 space-y-4 p-4">
      <MyExpensesView roleLabel="secretary" />
    </div>
  )
}
