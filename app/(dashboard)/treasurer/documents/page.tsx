import type { Metadata } from "next"

import TreasurerFinancialFilesPage from "@/components/dashboard/treasurer/financial/treasurer-financial-files-page"

export const metadata: Metadata = {
  title: "Financial Files",
  description:
    "Manage TrustLink Group financial reports, contribution records, loan documents, and statements",
}

export default function DocumentsPage() {
  return <TreasurerFinancialFilesPage />
}
