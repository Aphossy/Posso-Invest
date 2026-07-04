"use client"

import { useMemo } from "react"
import {
  AlertTriangle,
  CircleCheckBig,
  HandCoins,
  RefreshCcw,
} from "lucide-react"

import { useAdminLoans } from "@/hooks/api/use-loans"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader } from "@/components/common/loader"
import { LoanRequestsTable } from "@/components/dashboard/loans/loan-requests-table"

function formatRwf(amount?: string | null) {
  if (!amount) return "-"
  const value = Number.parseFloat(amount)
  if (Number.isNaN(value)) return amount
  return `${new Intl.NumberFormat("en-RW").format(value)}\u00A0RWF`
}

export function AdminFinancialLoansView() {
  const { loans, isPending, isRefetching, error, refetch } = useAdminLoans()

  const portfolioOutstanding = useMemo(() => {
    const outstandingStatuses = new Set(["approved", "disbursed", "repaying"])

    return loans.reduce((sum, item) => {
      if (!outstandingStatuses.has(item.status)) return sum

      const sourceAmount = item.approvedAmount || item.requestedAmount || "0"
      const value = Number.parseFloat(sourceAmount)
      return Number.isNaN(value) ? sum : sum + value
    }, 0)
  }, [loans])

  const overdueCount = useMemo(
    () => loans.filter((item) => item.status === "overdue").length,
    [loans]
  )

  const repaidCount = useMemo(
    () => loans.filter((item) => item.status === "repaid").length,
    [loans]
  )

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Financial Loans</h1>
          <p className="text-sm text-muted-foreground">
            Supervise the full loan lifecycle across all members.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void refetch()}
          disabled={isPending || isRefetching}>
          <RefreshCcw className="h-4 w-4" />
          {isRefetching ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>
            {error.help || error.message || "Unable to load loan data."}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Outstanding Portfolio
            </CardTitle>
            <HandCoins className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {isPending ? "-" : formatRwf(String(portfolioOutstanding))}
            </div>
            <p className="text-xs text-muted-foreground">
              Approved and active loans
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Overdue Loans</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {isPending ? "-" : overdueCount}
            </div>
            <p className="text-xs text-muted-foreground">Require follow-up</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Repaid Loans</CardTitle>
            <CircleCheckBig className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {isPending ? "-" : repaidCount}
            </div>
            <p className="text-xs text-muted-foreground">Closed successfully</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Loan Administration Table
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader className="h-4 w-4" />
              Loading loans...
            </div>
          ) : (
            <LoanRequestsTable
              initialData={loans}
              refreshUrl="/api/loans?limit=500"
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
