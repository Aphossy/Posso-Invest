"use client"

import { useMemo } from "react"
import {
  Banknote,
  CheckCircle,
  Clock,
  RefreshCcw,
  TrendingUp,
} from "lucide-react"

import { useTreasurerLoanDisbursements } from "@/hooks/api/use-loans"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader } from "@/components/common/loader"

import { LoanDisbursementsTable } from "./loan-disbursements-table"

function formatRwf(amount?: string | number | null) {
  if (amount == null || amount === "") return "-"
  const value = typeof amount === "string" ? Number.parseFloat(amount) : amount
  if (Number.isNaN(value)) return "-"
  return `${new Intl.NumberFormat("en-RW").format(value)}\u00A0RWF`
}

export function TreasurerLoanDisbursementsView() {
  const {
    allLoans,
    approvedCount,
    disbursedCount,
    disbursedTotal,
    isPending,
    isRefetching,
    error,
    refetch,
  } = useTreasurerLoanDisbursements()

  const pendingLabel = useMemo(
    () => (isPending ? "-" : `${approvedCount}`),
    [isPending, approvedCount]
  )

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Loan Disbursements</h1>
          <p className="text-sm text-muted-foreground">
            Review approved loans and record fund transfers to members.
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
            {error.help ?? error.message ?? "Unable to load disbursements."}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Awaiting Disbursement
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {pendingLabel}
            </div>
            <p className="text-xs text-muted-foreground">
              Approved, funds not yet sent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Disbursed</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {isPending ? "-" : disbursedCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Funds transferred to members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Disbursed
            </CardTitle>
            <Banknote className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {isPending ? "-" : formatRwf(disbursedTotal)}
            </div>
            <p className="text-xs text-muted-foreground">
              Cumulative disbursed amount
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Workflow hint */}
      {!isPending && approvedCount > 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400">
          <TrendingUp className="h-4 w-4 shrink-0" />
          <span>
            <strong>{approvedCount}</strong> loan
            {approvedCount !== 1 ? "s are" : " is"} approved and awaiting
            disbursement. Click <strong>Disburse</strong> on each row to confirm
            the fund transfer.
          </span>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Disbursement Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader className="h-4 w-4" />
              Loading disbursements...
            </div>
          ) : (
            <LoanDisbursementsTable
              initialData={allLoans}
              refreshUrl="/api/loans?status=approved,disbursed&limit=200"
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
