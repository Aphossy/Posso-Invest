import type { Metadata } from "next"

import SecretarySharedAssetsPage from "@/components/dashboard/secretary/assets/secretary-shared-assets-page"

export const metadata: Metadata = {
  title: "Shared Assets | President",
  description:
    "Browse group photos, media, and files shared with all TrustLink Group members.",
}

export default function PresidentAssetsPage() {
  return <SecretarySharedAssetsPage />
}
