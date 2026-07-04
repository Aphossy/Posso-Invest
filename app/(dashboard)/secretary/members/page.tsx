import { Metadata } from "next"

import SecretaryMembersPage from "@/components/dashboard/secretary/members/secretary-members-page"

export const metadata: Metadata = {
  title: "Member Directory",
  description: "Browse and view TrustLink Group organization members.",
}

export default function MembersPage() {
  return <SecretaryMembersPage />
}
