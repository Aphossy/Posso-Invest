import { Metadata } from "next"

import { LegalRegistrationForm } from "@/components/dashboard/admin/legal/legal-registration-form"

export const metadata: Metadata = {
  title: "Legal",
  description: "Legal page for 10/10 Ventures.",
}

export default function LegalPage() {
  return (
    <div className="flex-1 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Legal</h1>
        <p className="text-sm text-muted-foreground">
          Manage organization registration information and legal records.
        </p>
      </div>
      <LegalRegistrationForm />
    </div>
  )
}
