"use client"

import { useMemo } from "react"
import {
  AlertTriangle,
  Banknote,
  CheckCircle,
  RefreshCcw,
  RefreshCw,
} from "lucide-react"

import { useTreasurerLoanRepayments } from "@/hooks/api/use-loans"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader } from "@/components/common/loader"

import { LoanRepaymentsTable } from "./loan-repayments-table"

function formatRwf(amount?: string | number | null) {
  if (amount == null || amount === "") return "-"
  const value = typeof amount === "string" ? Number.parseFloat(amount) : amount
  if (Number.isNaN(value)) return "-"
  return `${new Intl.NumberFormat("en-RW").format(value)}\u00A0RWF`
}

export function TreasurerLoanRepaymentsView() {
  const {
    allLoans,
    repayingCount,
    overdueCount,
    repaidCount,
    outstandingTotal,
    isPending,
    isRefetching,
    error,
    refetch,
  } = useTreasurerLoanRepayments()

  const overdueLabel = useMemo(
    () => (isPending ? "-" : `${overdueCount}`),
    [isPending, overdueCount]
  )

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Loan Repayments</h1>
          <p className="text-sm text-muted-foreground">
            Track and manage repayment progress for all active loans.
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
            {error.help ?? error.message ?? "Unable to load repayments."}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Repaying</CardTitle>
            <RefreshCw className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {isPending ? "-" : repayingCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Active repayment in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {overdueLabel}
            </div>
            <p className="text-xs text-muted-foreground">
              Missed repayment deadline
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Repaid</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {isPending ? "-" : repaidCount}
            </div>
            <p className="text-xs text-muted-foreground">Fully settled loans</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <Banknote className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {isPending ? "-" : formatRwf(outstandingTotal)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total balance to be collected
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Overdue alert */}
      {!isPending && overdueCount > 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            <strong>{overdueCount}</strong> loan
            {overdueCount !== 1 ? "s are" : " is"} overdue. Follow up with the
            affected member{overdueCount !== 1 ? "s" : ""} immediately.
          </span>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Repayment Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader className="h-4 w-4" />
              Loading repayments...
            </div>
          ) : (
            <LoanRepaymentsTable
              initialData={allLoans}
              refreshUrl="/api/loans?status=disbursed,repaying,overdue,repaid&limit=200"
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
