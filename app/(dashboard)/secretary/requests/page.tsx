import { Metadata } from "next"

import SecretaryRequestsPage from "@/components/dashboard/secretary/requests/secretary-requests-page"

export const metadata: Metadata = {
  title: "Join Requests",
  description: "Manage membership invitations for TrustLink Group.",
}

export default function RequestsPage() {
  return <SecretaryRequestsPage />
}
