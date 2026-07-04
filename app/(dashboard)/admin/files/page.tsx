import UserAssetsPage from "@/components/dashboard/assets/user-assets-page"

export const metadata = {
  title: "My Files",
  description: "View and manage files uploaded by the current admin account",
}

export default function AssetPage() {
  return (
    <>
      <UserAssetsPage />
    </>
  )
}
