import { Metadata } from "next"

import { AuditReportView } from "@/components/dashboard/reports/audit-report-view"

export const metadata: Metadata = {
  title: "Audit Report",
  description:
    "Periodic 4-month financial audit covering contributions, loans, and compliance for TrustLink Group.",
}

export default function ReportsAuditPage() {
  return <AuditReportView />
}
