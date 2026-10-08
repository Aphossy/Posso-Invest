import type { Metadata } from "next"

import { BankAccountsManager } from "@/components/dashboard/admin/banking/bank-accounts-manager"

export const metadata: Metadata = {
  title: "Bank Accounts",
  description: "Manage official 10/10 Ventures bank accounts.",
}

export default function BankingPage() {
  return <BankAccountsManager />
}
