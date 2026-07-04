import { Metadata } from "next"

import { PresidentMembersView } from "@/components/dashboard/president/members/president-members-view"

export const metadata: Metadata = {
  title: "Member Directory | President",
  description: "Roster, roles, and membership overview for TrustLink Group.",
}

export default function PresidentMembersPage() {
  return <PresidentMembersView />
}
