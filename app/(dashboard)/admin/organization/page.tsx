import type { Metadata } from "next"

import OrganizationPage from "@/components/dashboard/admin/organization/organization-page"

export const metadata: Metadata = {
  title: "Organization",
  description: "Manage 10/10 Ventures organization settings.",
}

export default function Page() {
  return <OrganizationPage />
}
