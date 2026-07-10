import { Metadata } from "next"

import { ConstitutionView } from "@/components/dashboard/constitution/constitution-view"

export const metadata: Metadata = {
  title: "Constitution & Policies",
  description:
    "The governing constitution of 10/10 Ventures - Version 1.0, adopted January 10, 2026.",
}

export default function DocumentsConstitutionPage() {
  return <ConstitutionView />
}
