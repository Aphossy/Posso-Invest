import { Metadata } from "next"

import { ConstitutionView } from "@/components/dashboard/constitution/constitution-view"

export const metadata: Metadata = {
  title: "Organizational Statute",
  description:
    "The governing Organizational Statute (Bylaws) of 10/10 Ventures Ltd, effective September 1, 2026.",
}

export default function DocumentsConstitutionPage() {
  return <ConstitutionView />
}
