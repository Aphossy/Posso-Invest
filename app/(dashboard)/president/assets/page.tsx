import type { Metadata } from "next"

import SecretarySharedAssetsPage from "@/components/dashboard/secretary/assets/secretary-shared-assets-page"

export const metadata: Metadata = {
  title: "Shared Assets | President",
  description:
    "Browse group photos, media, and files shared with all 10/10 Ventures members.",
}

export default function PresidentAssetsPage() {
  return <SecretarySharedAssetsPage />
}
