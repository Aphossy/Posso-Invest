import type { Metadata } from "next"

import TreasurerReceiptsPage from "@/components/dashboard/treasurer/contributions/treasurer-receipts-page"

export const metadata: Metadata = {
  title: "Receipts",
  description:
    "Issue and archive contribution receipts, loan repayment proofs, and payment confirmations for 10/10 Ventures members",
}

export default function ContributionsReceiptsPage() {
  return <TreasurerReceiptsPage />
}
