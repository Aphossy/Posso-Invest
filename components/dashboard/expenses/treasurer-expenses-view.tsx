"use client"

import { useMemo, useState } from "react"
import { EXPENSE_CATEGORY_LABELS } from "@/db/schemas/operational-expense-schema"
import {
  exportExpenses,
  type ReportExportFormat,
} from "@/utils/report-export-utils"
import { format } from "date-fns"
import { AlertTriangle, Clock, Download, RefreshCcw } from "lucide-react"
import { toast } from "sonner"

import {
  useAllOperationalExpenses,
  useDeleteExpenseMutation,
  type OperationalExpenseEnriched,
} from "@/hooks/api/use-operational-expenses"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ExportReportDialog } from "@/components/dashboard/reports/export-report-dialog"

import { ApproveExpenseDialog } from "./approve-expense-dialog"
import { EditExpenseDialog } from "./edit-expense-dialog"
import { SubmitExpenseDialog } from "./submit-expense-dialog"

const statusStyles: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
}

function formatRwf(v: string | number | null | undefined) {
  const n = Number.parseFloat(String(v ?? "0"))
  if (isNaN(n)) return "-"
  return `${new Intl.NumberFormat("en-RW").format(n)} RWF`
}

function ExpenseRow({
  expense,
  onUpdated,
}: {
  expense: OperationalExpenseEnriched
  onUpdated: () => void
}) {
  const deleteMutation = useDeleteExpenseMutation()

  function handleDelete() {
    toast.promise(deleteMutation.mutateAsync({ id: expense.id }), {
      loading: "Deleting...",
      success: "Expense deleted.",
      error: (err) => err?.message ?? "Failed to delete.",
    })
  }

  return (
    <TableRow>
      <TableCell>
        <div>
          <div className="font-medium text-sm">{expense.description}</div>
          <div className="text-xs text-muted-foreground">
            {expense.submittedByName ?? "Unknown"} ·{" "}
            {EXPENSE_CATEGORY_LABELS[expense.category]}
          </div>
        </div>
      </TableCell>
      <TableCell className="tabular-nums font-medium text-sm">
        {formatRwf(expense.amount)}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {expense.expenseDate
          ? format(new Date(expense.expenseDate), "dd MMM yyyy")
          : "-"}
      </TableCell>
      <TableCell>
        <Badge className={statusStyles[expense.status] ?? ""}>
          {expense.status}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {expense.approvedByName ?? "-"}
        {expense.status === "rejected" && expense.rejectionNote && (
          <p className="text-xs text-rose-600 italic mt-0.5">
            {expense.rejectionNote}
          </p>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          {expense.status === "pending" ? (
            <>
              <ApproveExpenseDialog expense={expense} onUpdated={onUpdated} />
              <EditExpenseDialog expense={expense} onUpdated={onUpdated} />
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-rose-600 hover:text-rose-700"
                disabled={deleteMutation.isPending}
                onClick={handleDelete}>
                Delete
              </Button>
            </>
          ) : (
            <>
              <EditExpenseDialog expense={expense} onUpdated={onUpdated} />
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-rose-600 hover:text-rose-700"
                disabled={deleteMutation.isPending}
                onClick={handleDelete}>
                Delete
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}

export function TreasurerExpensesView() {
  const [exportOpen, setExportOpen] = useState(false)
  const { data, isPending, error, refetch } = useAllOperationalExpenses()

  const expenses = data?.data ?? []

  const { pending, approved, rejected, totalApproved, totalPending } =
    useMemo(() => {
      const pending: OperationalExpenseEnriched[] = []
      const approved: OperationalExpenseEnriched[] = []
      const rejected: OperationalExpenseEnriched[] = []
      let totalApproved = 0
      let totalPending = 0

      for (const e of expenses) {
        if (e.status === "pending") {
          pending.push(e)
          totalPending += Number.parseFloat(String(e.amount) || "0")
        } else if (e.status === "approved") {
          approved.push(e)
          totalApproved += Number.parseFloat(String(e.amount) || "0")
        } else {
          rejected.push(e)
        }
      }

      return { pending, approved, rejected, totalApproved, totalPending }
    }, [expenses])

  async function handleExport(fmt: ReportExportFormat, filename?: string) {
    await exportExpenses(
      "Operational Expenses",
      {
        totalCount: expenses.length,
        approvedCount: approved.length,
        approvedAmount: totalApproved,
        pendingCount: pending.length,
        pendingAmount: totalPending,
        rejectedCount: rejected.length,
      },
      expenses.map((e) => ({
        ...e,
        category: EXPENSE_CATEGORY_LABELS[e.category] || e.category,
      })),
      fmt,
      filename,
      true
    )
  }

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-7 w-48" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load expenses. Please refresh the page.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Operational Expenses
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and approve expenses submitted by committee members.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            className="gap-2">
            <RefreshCcw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setExportOpen(true)}
            className="gap-2"
            disabled={expenses.length === 0}>
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
          <SubmitExpenseDialog role="treasurer" />
        </div>
      </div>

      <ExportReportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        reportTitle="Operational Expenses"
        defaultFilename={`operational-expenses-${new Date().toISOString().split("T")[0]}`}
        onExport={handleExport}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Pending Approval</p>
            <p className="text-2xl font-bold tabular-nums text-amber-600 mt-1">
              {pending.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatRwf(totalPending)} awaiting review
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total Approved</p>
            <p className="text-2xl font-bold tabular-nums text-emerald-600 mt-1">
              {formatRwf(totalApproved)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {approved.length} expenses approved
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Rejected</p>
            <p className="text-2xl font-bold tabular-nums mt-1">
              {rejected.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Expenses not approved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending banner */}
      {pending.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-800">
          <Clock className="h-4 w-4 text-amber-600" />
          <AlertDescription>
            <strong>{pending.length}</strong> expense
            {pending.length > 1 ? "s" : ""} awaiting your review totalling{" "}
            <strong>{formatRwf(totalPending)}</strong>.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending{" "}
            {pending.length > 0 && (
              <Badge
                variant="secondary"
                className="ml-1.5 h-4 min-w-4 px-1 text-xs">
                {pending.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        {(
          [
            ["pending", pending],
            ["approved", approved],
            ["rejected", rejected],
            ["all", expenses],
          ] as const
        ).map(([tab, rows]) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            <ExpenseTable
              rows={rows as OperationalExpenseEnriched[]}
              onUpdated={() => refetch()}
              emptyLabel={
                tab === "pending"
                  ? "No pending expenses."
                  : tab === "approved"
                    ? "No approved expenses yet."
                    : tab === "rejected"
                      ? "No rejected expenses."
                      : "No expenses recorded yet."
              }
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

function ExpenseTable({
  rows,
  onUpdated,
  emptyLabel,
}: {
  rows: OperationalExpenseEnriched[]
  onUpdated: () => void
  emptyLabel: string
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Expense</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reviewed by</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((e) => (
              <ExpenseRow key={e.id} expense={e} onUpdated={onUpdated} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
