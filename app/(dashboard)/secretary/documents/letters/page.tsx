import type { Metadata } from "next"

import SecretaryLettersPage from "@/components/dashboard/secretary/documents/secretary-letters-page"

export const metadata: Metadata = {
  title: "Letters & Approvals",
  description:
    "Manage TrustLink Group correspondence, approval letters, legal documents, and formal letters",
}

export default function DocumentsLettersPage() {
  return <SecretaryLettersPage />
}
