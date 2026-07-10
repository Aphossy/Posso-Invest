import { Metadata } from "next"

import { ConstitutionView } from "@/components/dashboard/constitution/constitution-view"

export const metadata: Metadata = {
  title: "Constitution | President",
  description:
    "The governing constitution of 10/10 Ventures - Version 1.0, adopted August 01, 2026.",
}

export default function PresidentConstitutionPage() {
  return <ConstitutionView />
}
