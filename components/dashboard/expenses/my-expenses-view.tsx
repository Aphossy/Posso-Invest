"use client"

import { useState } from "react"
import { EXPENSE_CATEGORY_LABELS } from "@/db/schemas/operational-expense-schema"
import {
  exportExpenses,
  type ReportExportFormat,
} from "@/utils/report-export-utils"
import { format } from "date-fns"
import { AlertTriangle, Download, RefreshCcw } from "lucide-react"
import { toast } from "sonner"

import {
  useDeleteExpenseMutation,
  useMyOperationalExpenses,
  type OperationalExpenseEnriched,
} from "@/hooks/api/use-operational-expenses"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ExportReportDialog } from "@/components/dashboard/reports/export-report-dialog"

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

export function MyExpensesView({ roleLabel }: { roleLabel: string }) {
  const [exportOpen, setExportOpen] = useState(false)
  const { data, isPending, error, refetch } = useMyOperationalExpenses()
  const deleteMutation = useDeleteExpenseMutation()
  const expenses = data?.data ?? []

  const totalApproved = expenses
    .filter((e) => e.status === "approved")
    .reduce((s, e) => s + Number.parseFloat(String(e.amount) || "0"), 0)

  const totalPending = expenses
    .filter((e) => e.status === "pending")
    .reduce((s, e) => s + Number.parseFloat(String(e.amount) || "0"), 0)

  async function handleExport(fmt: ReportExportFormat, filename?: string) {
    await exportExpenses(
      "My Expenses",
      {
        totalCount: expenses.length,
        approvedCount: expenses.filter((e) => e.status === "approved").length,
        approvedAmount: totalApproved,
        pendingCount: expenses.filter((e) => e.status === "pending").length,
        pendingAmount: totalPending,
        rejectedCount: expenses.filter((e) => e.status === "rejected").length,
      },
      expenses.map((e) => ({
        ...e,
        category: EXPENSE_CATEGORY_LABELS[e.category] || e.category,
      })),
      fmt,
      filename,
      false
    )
  }

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load expenses. Please refresh.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Expenses</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Submit and track your operational expenses as {roleLabel}. Each
            expense requires treasurer approval.
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
          <SubmitExpenseDialog />
        </div>
      </div>

      <ExportReportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        reportTitle="My Expenses"
        defaultFilename={`my-expenses-${new Date().toISOString().split("T")[0]}`}
        onExport={handleExport}
      />

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total Submitted</p>
            <p className="text-2xl font-bold tabular-nums mt-1">
              {expenses.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Approved Amount</p>
            <p className="text-2xl font-bold tabular-nums text-emerald-600 mt-1">
              {formatRwf(totalApproved)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold tabular-nums text-amber-600 mt-1">
              {expenses.filter((e) => e.status === "pending").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      {expenses.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
          No expenses submitted yet. Click &ldquo;Submit Expense&rdquo; to get
          started.
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium text-sm">
                      {e.description}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {EXPENSE_CATEGORY_LABELS[e.category]}
                    </TableCell>
                    <TableCell className="tabular-nums text-sm font-medium">
                      {formatRwf(e.amount)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {e.expenseDate
                        ? format(new Date(e.expenseDate), "dd MMM yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusStyles[e.status] ?? ""}>
                        {e.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[160px]">
                      {e.status === "rejected" && e.rejectionNote ? (
                        <span className="text-rose-600 italic">
                          {e.rejectionNote}
                        </span>
                      ) : (
                        (e.notes ?? "-")
                      )}
                    </TableCell>
                    <TableCell>
                      {e.status === "pending" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-rose-600 hover:text-rose-700"
                          disabled={deleteMutation.isPending}
                          onClick={() =>
                            toast.promise(
                              deleteMutation.mutateAsync({ id: e.id }),
                              {
                                loading: "Deleting...",
                                success: "Expense deleted.",
                                error: (err) =>
                                  err?.message ?? "Failed to delete.",
                              }
                            )
                          }>
                          Delete
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
