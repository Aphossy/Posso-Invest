import type { Metadata } from "next"

import { UserSupportView } from "@/components/dashboard/support/user-support-view"

export const metadata: Metadata = {
  title: "Support",
  description: "Submit tickets and get help from the 10/10 Ventures support team",
}

export default function UserSupportPage() {
  return <UserSupportView />
}
