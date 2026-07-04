import type { Metadata } from "next"

import InvitationsPage from "@/components/dashboard/admin/members/invitations-page"

export const metadata: Metadata = {
  title: "Member Invitations",
  description: "Track and manage organization invitations in TrustLink Group.",
}

export default function Page() {
  return <InvitationsPage />
}
