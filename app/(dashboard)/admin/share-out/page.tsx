import { Metadata } from "next"

import { PresidentShareOutView } from "@/components/dashboard/share-out/president-share-out-view"

export const metadata: Metadata = {
  title: "Year-end Share-out | Admin",
  description: "Review and approve the annual fund distribution to members.",
}

export default async function AdminShareOutPage() {
  return <PresidentShareOutView role="admin" />
}
