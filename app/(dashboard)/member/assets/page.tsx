import type { Metadata } from "next"

import MemberSharedAssetsPage from "@/components/dashboard/member/assets/member-shared-assets-page"

export const metadata: Metadata = {
  title: "Member Shared Assets",
  description:
    "Browse Public and All Members assets shared by other TrustLink Group members",
}

export default function UserAssetsPage() {
  return <MemberSharedAssetsPage />
}
