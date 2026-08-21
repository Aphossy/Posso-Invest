import type { Metadata } from "next"

import InvitationsPage from "@/components/dashboard/admin/members/invitations-page"

export const metadata: Metadata = {
  title: "Member Invitations",
  description: "Track and manage organization invitations in 10/10 Ventures.",
}

export default function Page() {
  return <InvitationsPage />
}
