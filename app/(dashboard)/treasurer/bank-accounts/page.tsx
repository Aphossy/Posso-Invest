import type { Metadata } from "next"

import { MemberBankAccountsView } from "@/components/dashboard/bank-accounts/member-bank-accounts-view"

export const metadata: Metadata = {
  title: "Group Bank Accounts",
  description: "View official bank account details for group payments.",
}

export default function TreasurerBankAccountsPage() {
  return <MemberBankAccountsView />
}
