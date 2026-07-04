import { Metadata } from "next"

import { UserSavingsView } from "@/components/dashboard/savings/user-savings-view"

export const metadata: Metadata = {
  title: "My Savings",
  description: "Monitor your confirmed savings, pending records, and balances.",
}

export default async function UserSavingsPage() {
  return <UserSavingsView />
}
