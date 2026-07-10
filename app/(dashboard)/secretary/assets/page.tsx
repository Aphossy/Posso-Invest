import type { Metadata } from "next"

import SecretarySharedAssetsPage from "@/components/dashboard/secretary/assets/secretary-shared-assets-page"

export const metadata: Metadata = {
  title: "Shared Assets",
  description:
    "Browse group photos, media, and files shared with 10/10 Ventures committee members and all members",
}

export default function SecretaryAssetsPage() {
  return <SecretarySharedAssetsPage />
}
