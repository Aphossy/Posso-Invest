import type { Metadata } from "next"

import PresidentLettersPage from "@/components/dashboard/president/documents/president-letters-page"

export const metadata: Metadata = {
  title: "Formal Letters",
  description:
    "Official correspondence, approval letters, and formal documents signed by the President.",
}

export default function DocumentsLettersPage() {
  return <PresidentLettersPage />
}
