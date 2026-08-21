import type { Metadata } from "next"

import RolesPage from "@/components/dashboard/admin/roles/roles-page"

export const metadata: Metadata = {
  title: "Roles",
  description: "Roles and permissions for 10/10 Ventures.",
}

export default function Page() {
  return <RolesPage />
}
