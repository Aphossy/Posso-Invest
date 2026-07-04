import { Metadata } from "next"

import { PresidentShareOutView } from "@/components/dashboard/share-out/president-share-out-view"

export const metadata: Metadata = {
  title: "Year-end Share-out | President",
  description: "Review and approve the annual fund distribution to members.",
}

export default async function PresidentShareOutPage() {
  return <PresidentShareOutView role="president" />
}
