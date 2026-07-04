import { Metadata } from "next"

import { UserPenaltiesView } from "@/components/dashboard/penalties/user-penalties-view"

export const metadata: Metadata = {
  title: "My Penalties",
  description: "View your late payment penalties and penalty history.",
}

export default function UserPenaltiesPage() {
  return <UserPenaltiesView />
}
