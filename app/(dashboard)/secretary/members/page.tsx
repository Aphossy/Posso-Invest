import { Metadata } from "next"

import SecretaryMembersPage from "@/components/dashboard/secretary/members/secretary-members-page"

export const metadata: Metadata = {
  title: "Member Directory",
  description: "Browse and view 10/10 Ventures members.",
}

export default function MembersPage() {
  return <SecretaryMembersPage />
}
