import { Metadata } from "next"

import { AdminLeadershipView } from "@/components/dashboard/admin/leadership/admin-leadership-view"

export const metadata: Metadata = {
  title: "Leadership Terms",
  description:
    "Administrative leadership term management, countdowns, and constitutional governance rules.",
}

export default function LeadershipPage() {
  return <AdminLeadershipView />
}
