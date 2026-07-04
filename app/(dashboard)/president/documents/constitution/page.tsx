import { Metadata } from "next"

import { ConstitutionView } from "@/components/dashboard/constitution/constitution-view"

export const metadata: Metadata = {
  title: "Constitution | President",
  description:
    "The governing constitution of TrustLink Group Ikimina - Version 1.0, adopted January 10, 2026.",
}

export default function PresidentConstitutionPage() {
  return <ConstitutionView />
}
