"use client"

import {
  Banknote,
  CheckCircle,
  Clock,
  RefreshCcw,
  TrendingUp,
} from "lucide-react"

import { useTreasurerLoanRequests } from "@/hooks/api/use-loans"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader } from "@/components/common/loader"
import { LoanRequestsTable } from "@/components/dashboard/loans/loan-requests-table"

function formatRwf(amount: number) {
  if (!Number.isFinite(amount)) return "-"
  return `${new Intl.NumberFormat("en-RW").format(Math.round(amount))}\u00A0RWF`
}

export function TreasurerLoanRequestsView() {
  const {
    requestedCount,
    approvedCount,
    disbursedTotal,
    totalPortfolio,
    allLoans,
    isPending,
    isRefetching,
    error,
    refetch,
  } = useTreasurerLoanRequests()

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Loan Requests</h1>
          <p className="text-sm text-muted-foreground">
            Review and track all member loan activity.
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
            {error.help || error.message || "Unable to load loan requests."}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {isPending ? "-" : requestedCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {isPending
                ? ""
                : `${requestedCount === 1 ? "request" : "requests"} awaiting review`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {isPending ? "-" : approvedCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {isPending ? "" : "Awaiting disbursement"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Disbursed
            </CardTitle>
            <Banknote className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {isPending ? "-" : formatRwf(disbursedTotal)}
            </div>
            <p className="text-xs text-muted-foreground">
              {isPending ? "" : "Across disbursed & active loans"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Loan Portfolio
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {isPending ? "-" : formatRwf(totalPortfolio)}
            </div>
            <p className="text-xs text-muted-foreground">
              {isPending ? "" : `Total across all ${allLoans.length} loans`}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Pending Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader className="h-4 w-4" />
              Loading loan requests...
            </div>
          ) : (
            <LoanRequestsTable
              initialData={allLoans}
              refreshUrl="/api/loans?limit=200"
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
