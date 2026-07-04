import type { Metadata } from "next"

import SharedAssetsPage from "@/components/dashboard/admin/assets/shared-assets-page"

export const metadata: Metadata = {
  title: "Shared Assets",
  description:
    "Browse and manage Posso Ventures shared photos, media, and files visible to members",
}

export default function AdminAssetsPage() {
  return <SharedAssetsPage />
}
