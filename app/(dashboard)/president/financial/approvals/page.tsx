import { Metadata } from "next"
import { AlertTriangle, CheckCircle2, Shield, XCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export const metadata: Metadata = {
  title: "Pending Approvals | President",
  description:
    "Dual-authorization for transactions above 50,000 RWF per the TrustLink constitution.",
}

const pendingApprovals = [
  {
    id: "TXN-012",
    type: "Loan Disbursement",
    member: "J. Mukamana",
    amount: "150,000 RWF",
    requestedBy: "Treasurer",
    date: "April 30, 2026",
    status: "Awaiting President",
  },
  {
    id: "TXN-011",
    type: "Fund Transfer",
    member: "Group Account",
    amount: "80,000 RWF",
    requestedBy: "Treasurer",
    date: "April 28, 2026",
    status: "Awaiting President",
  },
]

const recentlyApproved = [
  {
    id: "TXN-010",
    type: "Loan Disbursement",
    member: "A. Habimana",
    amount: "200,000 RWF",
    date: "March 15, 2026",
    outcome: "Approved",
  },
  {
    id: "TXN-009",
    type: "Meeting Logistics",
    member: "Group Account",
    amount: "55,000 RWF",
    date: "March 4, 2026",
    outcome: "Approved",
  },
]

export default function PresidentApprovalsPage() {
  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Pending Approvals</h1>
          <p className="text-sm text-muted-foreground">
            All transactions above 50,000 RWF require dual authorization from
            the President and Treasurer per Article 8.4 of the constitution.
          </p>
        </div>
        <Badge
          variant="outline"
          className="gap-1 border-amber-300 bg-amber-50 text-amber-700">
          <AlertTriangle className="h-3.5 w-3.5" />
          {pendingApprovals.length} Awaiting Your Signature
        </Badge>
      </div>

      {/* Constitutional Notice */}
      <Card className="border-purple-200 bg-purple-50/50">
        <CardContent className="flex items-start gap-3 pt-4 pb-4 text-sm">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-purple-600" />
          <p className="text-purple-900">
            <strong>Article 8.4 - Fund Usage:</strong> No funds shall be
            withdrawn or transferred without the dual authorization of the{" "}
            <strong>President</strong> and <strong>Treasurer</strong>. This
            applies to all transactions exceeding 50,000 RWF.
          </p>
        </CardContent>
      </Card>

      {/* Pending */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">
            Awaiting Your Authorization
          </CardTitle>
          <Badge
            variant="outline"
            className="border-amber-300 bg-amber-50 text-amber-700">
            {pendingApprovals.length} Pending
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingApprovals.map((txn) => (
            <div key={txn.id} className="rounded-md border px-4 py-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">
                      {txn.id}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {txn.date}
                    </span>
                  </div>
                  <p className="text-sm font-medium">{txn.type}</p>
                  <p className="text-xs text-muted-foreground">
                    {txn.member} - {txn.amount}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Requested by: {txn.requestedBy}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="shrink-0 border-amber-300 bg-amber-50 text-amber-700">
                  {txn.status}
                </Badge>
              </div>
              <Separator />
              <div className="flex gap-2">
                <Button size="sm" className="gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Authorize
                </Button>
                <Button size="sm" variant="outline" className="gap-1">
                  <XCircle className="h-3.5 w-3.5" />
                  Decline
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recently Approved */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Recently Authorized
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentlyApproved.map((txn) => (
            <div
              key={txn.id}
              className="flex items-center justify-between rounded-md border px-4 py-3 gap-3 opacity-75">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground">
                    {txn.id}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {txn.date}
                  </span>
                </div>
                <p className="text-sm font-medium">{txn.type}</p>
                <p className="text-xs text-muted-foreground">
                  {txn.member} - {txn.amount}
                </p>
              </div>
              <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                {txn.outcome}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
