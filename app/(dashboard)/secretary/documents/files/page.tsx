import type { Metadata } from "next"

import UserAssetsPage from "@/components/dashboard/assets/user-assets-page"

export const metadata: Metadata = {
  title: "My Files",
  description:
    "View and manage files uploaded by the current secretary account",
}

export default function SecretaryDocumentLibraryPage() {
  return <UserAssetsPage />
}
