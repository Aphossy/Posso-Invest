import type { Metadata } from "next"

import OrganizationPage from "@/components/dashboard/admin/organization/organization-page"

export const metadata: Metadata = {
  title: "Organization",
  description: "Manage Posso Ventures organization settings.",
}

export default function Page() {
  return <OrganizationPage />
}
