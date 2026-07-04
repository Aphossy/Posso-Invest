import { Metadata } from "next"

import { AdminPenaltiesView } from "@/components/dashboard/penalties/admin-penalties-view"

export const metadata: Metadata = {
  title: "Penalties Overview",
  description: "Group-wide oversight of late payment penalties.",
}

export default function AdminPenaltiesPage() {
  return <AdminPenaltiesView />
}
