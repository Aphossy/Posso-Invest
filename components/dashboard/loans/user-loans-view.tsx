"use client"

import { useMemo, useState } from "react"
import type { Loan } from "@/db/schemas/loan-schema"
import {
  AlertTriangle,
  CircleDollarSign,
  Eye,
  HandCoins,
  PencilLine,
  RefreshCcw,
  Trash2,
  TrendingUp,
} from "lucide-react"
import { toast } from "sonner"

import {
  useDeleteLoanMutation,
  useLoanRepayments,
  useMyLoans,
  useUpdateLoanMutation,
} from "@/hooks/api/use-loans"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Loader } from "@/components/common/loader"
import { LoanRequestForm } from "@/components/dashboard/loans/loan-request-form"
import { RequestLoanTrigger } from "@/components/dashboard/loans/request-loan-trigger"

function formatRwf(amount?: string | null) {
  if (!amount) return "-"
  const value = Number.parseFloat(amount)
  if (Number.isNaN(value)) return amount
  return `${new Intl.NumberFormat("en-RW").format(value)}\u00A0RWF`
}

function formatDate(value?: string | Date | null) {
  if (!value) return "-"
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleDateString("en-RW", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function parseAmount(value?: string | number | null) {
  if (value === null || value === undefined) return null
  const amount =
    typeof value === "number" ? value : Number.parseFloat(String(value))
  return Number.isFinite(amount) ? amount : null
}

function normalizeInterestPercent(value?: string | number | null) {
  if (value === null || value === undefined) return null
  const parsed =
    typeof value === "number" ? value : Number.parseFloat(String(value))
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return parsed <= 1 ? parsed * 100 : parsed
}

function formatInterestRate(value?: string | number | null) {
  const percent = normalizeInterestPercent(value)
  if (percent === null) return "-"
  return `${new Intl.NumberFormat("en-RW", {
    maximumFractionDigits: 2,
  }).format(percent)}%`
}

function getRepaymentBreakdown(loan?: Loan | null) {
  if (!loan) return null

  const requested = parseAmount(loan.requestedAmount)
  const approved = parseAmount(loan.approvedAmount)
  const principal = approved ?? requested
  const interestPercent = normalizeInterestPercent(loan.interestRate)

  if (principal === null || interestPercent === null) {
    return {
      principal,
      principalSource: approved !== null ? "approved" : "requested",
      interestPercent,
      interestAmount: null,
      totalRepayment: null,
      monthlyInstallment: null,
    }
  }

  const interestAmount = Math.round((principal * interestPercent) / 100)
  const totalRepayment = principal + interestAmount
  const monthlyInstallment = loan.termMonths
    ? Math.ceil(totalRepayment / loan.termMonths)
    : null

  return {
    principal,
    principalSource: approved !== null ? "approved" : "requested",
    interestPercent,
    interestAmount,
    totalRepayment,
    monthlyInstallment,
  }
}

function statusVariant(status?: string) {
  switch (status) {
    case "approved":
    case "repaid":
      return "success"
    case "requested":
    case "repaying":
    case "disbursed":
      return "warning"
    case "rejected":
    case "overdue":
      return "danger"
    default:
      return "outline"
  }
}

function getDaysUntilDue(dueDate?: string | Date | null): number | null {
  if (!dueDate) return null
  const due = dueDate instanceof Date ? dueDate : new Date(dueDate)
  if (Number.isNaN(due.getTime())) return null
  return Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

const ACTIVE_STATUSES = ["approved", "disbursed", "repaying"] as const
type ActiveStatus = (typeof ACTIVE_STATUSES)[number]
function isActiveStatus(status?: string): status is ActiveStatus {
  return ACTIVE_STATUSES.includes(status as ActiveStatus)
}

function isMutableLoan(loan?: Loan | null) {
  return loan?.status === "requested"
}

export function UserLoansView() {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const { data, isPending, error, refetch, isRefetching } = useMyLoans(50)
  const updateLoan = useUpdateLoanMutation()
  const deleteLoan = useDeleteLoanMutation()

  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null)
  const [editingLoanId, setEditingLoanId] = useState<string | null>(null)
  const [deletingLoanId, setDeletingLoanId] = useState<string | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState("")

  const loans = useMemo(() => data?.data ?? [], [data?.data])
  const selectedLoan = loans.find((item) => item.id === selectedLoanId) ?? null
  const editingLoan = loans.find((item) => item.id === editingLoanId) ?? null
  const deletingLoan = loans.find((item) => item.id === deletingLoanId) ?? null
  const deleteConfirmText = "DELETE LOAN REQUEST"
  const isDeleteEnabled = deleteConfirm === deleteConfirmText
  const selectedLoanRepayment = useMemo(
    () => getRepaymentBreakdown(selectedLoan),
    [selectedLoan]
  )

  const repaymentTrackedStatuses = [
    "disbursed",
    "repaying",
    "overdue",
    "repaid",
  ]
  const repaymentLoanId =
    selectedLoan && repaymentTrackedStatuses.includes(selectedLoan.status)
      ? selectedLoan.id
      : undefined
  const repaymentDetailQuery = useLoanRepayments(repaymentLoanId)
  const repaymentSummary = repaymentDetailQuery.data?.data.summary
  const repaymentHistory = repaymentDetailQuery.data?.data.repayments ?? []

  const totalRequested = useMemo(() => {
    return loans.reduce((sum, loan) => {
      const value = Number.parseFloat(loan.requestedAmount || "0")
      return Number.isNaN(value) ? sum : sum + value
    }, 0)
  }, [loans])

  const pendingCount = useMemo(
    () => loans.filter((loan) => loan.status === "requested").length,
    [loans]
  )

  const activeCount = useMemo(
    () =>
      loans.filter((loan) =>
        ["approved", "disbursed", "repaying"].includes(loan.status)
      ).length,
    [loans]
  )

  const latestLoan = loans[0] ?? null

  const dueAlertLoan = useMemo(() => {
    const candidates = loans
      .filter((l) => isActiveStatus(l.status) && l.dueDate)
      .map((l) => ({ loan: l, daysLeft: getDaysUntilDue(l.dueDate) }))
      .filter(({ daysLeft }) => daysLeft !== null && daysLeft <= 14)
      .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0))
    return candidates[0] ?? null
  }, [loans])

  const loanCards = loans

  const editInitialValues = useMemo(
    () =>
      editingLoan
        ? {
            requestedAmount: editingLoan.requestedAmount || "",
            termMonths: editingLoan.termMonths
              ? String(editingLoan.termMonths)
              : "",
            purpose: editingLoan.metadata?.reason || "",
            notes: editingLoan.notes || "",
          }
        : undefined,
    [editingLoan]
  )

  const handleEditSubmit = async (payload: {
    requestedAmount: string
    termMonths?: number
    notes?: string
    metadata: { reason?: string }
  }) => {
    if (!editingLoan) return
    try {
      await updateLoan.mutateAsync({
        id: editingLoan.id,
        data: payload,
      })
      toast.success("Loan request updated")
      setEditingLoanId(null)
      setSelectedLoanId(null)
    } catch (error) {
      console.error(error)
      toast.error(
        error instanceof Error ? error.message : "Unable to update loan request"
      )
      throw error
    }
  }

  const handleDelete = async () => {
    if (!deletingLoan) return
    try {
      await deleteLoan.mutateAsync({ id: deletingLoan.id })
      toast.success("Loan request deleted")
      setDeletingLoanId(null)
      setDeleteConfirm("")
      setSelectedLoanId((current) =>
        current === deletingLoan.id ? null : current
      )
    } catch (error) {
      console.error(error)
      toast.error(
        error instanceof Error ? error.message : "Unable to delete loan request"
      )
    }
  }

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">My Loans</h1>
          <p className="text-sm text-muted-foreground">
            Review requests, edit pending applications, and track repayment
            progress.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => void refetch()}
            disabled={isRefetching}>
            <RefreshCcw className="h-4 w-4" />
            {isRefetching ? "Refreshing..." : "Refresh"}
          </Button>
          <RequestLoanTrigger />
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>
            {error.help || error.message || "Unable to load your loans."}
          </AlertDescription>
        </Alert>
      ) : null}

      {dueAlertLoan ? (
        <Alert variant={dueAlertLoan.daysLeft! < 0 ? "destructive" : "warning"}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {dueAlertLoan.daysLeft! < 0 ? (
              <>
                Your loan repayment is{" "}
                <strong>
                  {Math.abs(dueAlertLoan.daysLeft!)} day
                  {Math.abs(dueAlertLoan.daysLeft!) !== 1 ? "s" : ""} overdue
                </strong>
                . Please contact the committee immediately.
              </>
            ) : dueAlertLoan.daysLeft === 0 ? (
              <>
                Your loan repayment is <strong>due today</strong> (
                {formatDate(dueAlertLoan.loan.dueDate)}). Please make your
                payment as soon as possible.
              </>
            ) : (
              <>
                Your loan repayment is due in{" "}
                <strong>
                  {dueAlertLoan.daysLeft} day
                  {dueAlertLoan.daysLeft !== 1 ? "s" : ""}
                </strong>{" "}
                on {formatDate(dueAlertLoan.loan.dueDate)}. Make sure you are
                ready.
              </>
            )}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Requested Total
            </CardTitle>
            <HandCoins className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {loans.length > 0 ? formatRwf(String(totalRequested)) : "-"}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all submitted requests
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Pending Requests
            </CardTitle>
            <CircleDollarSign className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {pendingCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Still editable and deletable
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
            <TrendingUp className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {activeCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Approved, disbursed, or repaying
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold">
              Loan Timeline
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Latest requests with quick access to details and actions.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {latestLoan
              ? `Latest: ${formatDate(latestLoan.requestedAt)}`
              : "No requests yet"}
          </p>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader className="h-4 w-4" />
              Loading loans...
            </div>
          ) : loans.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              You have not submitted any loan requests yet.
            </div>
          ) : (
            <div className="space-y-3">
              {loanCards.map((loan, index) => (
                <div key={loan.id} className="relative pl-8">
                  {index < loanCards.length - 1 ? (
                    <div className="absolute top-6 left-2.5 h-[calc(100%+0.75rem)] w-px bg-border" />
                  ) : null}
                  <div className="absolute top-2 left-0 rounded-full border bg-background p-1">
                    <CircleDollarSign className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-accent/40">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold tabular-nums">
                            {formatRwf(loan.requestedAmount)}
                          </p>
                          <Badge variant={statusVariant(loan.status)}>
                            {loan.status}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Requested {formatDate(loan.requestedAt)}
                          {loan.termMonths
                            ? ` • ${loan.termMonths} months`
                            : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedLoanId(loan.id)}>
                          <Eye className="h-4 w-4" />
                          Details
                        </Button>
                        {isMutableLoan(loan) ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingLoanId(loan.id)}>
                              <PencilLine className="h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setDeletingLoanId(loan.id)}>
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide">
                          Purpose
                        </p>
                        <p className="line-clamp-1">
                          {loan.metadata?.reason || "No purpose provided."}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide">
                          Due date
                        </p>
                        <p>{formatDate(loan.dueDate)}</p>
                      </div>
                      <div>
                        {isActiveStatus(loan.status) && loan.dueDate ? (
                          <>
                            <p className="text-xs uppercase tracking-wide">
                              Repayment due
                            </p>
                            {(() => {
                              const days = getDaysUntilDue(loan.dueDate)
                              if (days === null)
                                return <p>{formatDate(loan.dueDate)}</p>
                              if (days < 0)
                                return (
                                  <p className="font-medium text-red-600">
                                    {Math.abs(days)} day
                                    {Math.abs(days) !== 1 ? "s" : ""} overdue
                                  </p>
                                )
                              if (days === 0)
                                return (
                                  <p className="font-medium text-red-600">
                                    Due today
                                  </p>
                                )
                              if (days <= 7)
                                return (
                                  <p className="font-medium text-amber-600">
                                    {days} day{days !== 1 ? "s" : ""} left
                                  </p>
                                )
                              return (
                                <p className="font-medium">{days} days left</p>
                              )
                            })()}
                          </>
                        ) : (
                          <>
                            <p className="text-xs uppercase tracking-wide">
                              Status note
                            </p>
                            <p>
                              {isMutableLoan(loan)
                                ? "Pending review"
                                : loan.status === "rejected"
                                  ? "Request was rejected"
                                  : "Read-only record"}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet
        open={Boolean(selectedLoan)}
        onOpenChange={(open) => !open && setSelectedLoanId(null)}>
        <SheetContent className="flex h-[100dvh] w-full flex-col overflow-hidden p-0 sm:max-w-md">
          <SheetHeader className="shrink-0 border-b bg-muted/40 px-4 py-4 text-left">
            <SheetTitle>Loan Details</SheetTitle>
            <SheetDescription>
              Review the full request information and next steps.
            </SheetDescription>
          </SheetHeader>

          {selectedLoan ? (
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">
                  Requested Amount
                </p>
                <p className="text-base font-semibold tabular-nums">
                  {formatRwf(selectedLoan.requestedAmount)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant={statusVariant(selectedLoan.status)}>
                    {selectedLoan.status}
                  </Badge>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Term</p>
                  <p className="text-sm font-medium">
                    {selectedLoan.termMonths
                      ? `${selectedLoan.termMonths} months`
                      : "-"}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Requested At</p>
                  <p className="text-sm font-medium">
                    {formatDate(selectedLoan.requestedAt)}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Due Date</p>
                  <p className="text-sm font-medium">
                    {formatDate(selectedLoan.dueDate)}
                  </p>
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Purpose</p>
                <p className="text-sm">
                  {selectedLoan.metadata?.reason || "No purpose provided."}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Notes</p>
                <p className="text-sm">
                  {selectedLoan.notes?.trim() || "No notes provided."}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Approved Amount</p>
                <p className="text-sm font-medium">
                  {formatRwf(selectedLoan.approvedAmount)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Interest Rate</p>
                  <p className="text-sm font-medium">
                    {formatInterestRate(selectedLoan.interestRate)}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">
                    Principal Used
                  </p>
                  <p className="text-sm font-medium">
                    {selectedLoanRepayment?.principal !== null
                      ? formatRwf(String(selectedLoanRepayment?.principal))
                      : "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Based on {selectedLoanRepayment?.principalSource || "loan"}{" "}
                    amount
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">
                    Interest Amount
                  </p>
                  <p className="text-sm font-medium">
                    {selectedLoanRepayment?.interestAmount !== null
                      ? formatRwf(String(selectedLoanRepayment?.interestAmount))
                      : "-"}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">
                    Total to Repay
                  </p>
                  <p className="text-sm font-semibold">
                    {selectedLoanRepayment?.totalRepayment !== null
                      ? formatRwf(String(selectedLoanRepayment?.totalRepayment))
                      : "-"}
                  </p>
                </div>
                <div className="col-span-2 rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">
                    Estimated Monthly Payment
                  </p>
                  <p className="text-sm font-medium">
                    {selectedLoanRepayment?.monthlyInstallment !== null
                      ? `${formatRwf(String(selectedLoanRepayment?.monthlyInstallment))} / month`
                      : selectedLoan.termMonths
                        ? "-"
                        : "Set a term to estimate monthly installments"}
                  </p>
                </div>
              </div>

              {repaymentLoanId ? (
                <div className="space-y-3 rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Repayment progress</p>
                    <span className="text-sm font-medium tabular-nums">
                      {repaymentSummary?.progressPercent ?? 0}%
                    </span>
                  </div>
                  <Progress value={repaymentSummary?.progressPercent ?? 0} />
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Repaid</p>
                      <p className="font-medium tabular-nums text-emerald-700 dark:text-emerald-400">
                        {formatRwf(String(repaymentSummary?.totalRepaid ?? 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Outstanding
                      </p>
                      <p className="font-semibold tabular-nums">
                        {formatRwf(String(repaymentSummary?.outstanding ?? 0))}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">
                      Payment history
                    </p>
                    {repaymentDetailQuery.isPending ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader className="h-4 w-4" />
                        Loading payments...
                      </div>
                    ) : repaymentHistory.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No payments recorded yet.
                      </p>
                    ) : (
                      <ul className="divide-y rounded-lg border">
                        {repaymentHistory.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                            <span className="font-medium tabular-nums">
                              {formatRwf(item.amount)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(item.paidAt)} ·{" "}
                              {item.paymentMethod?.replace("_", " ") ?? "cash"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ) : null}

              {isMutableLoan(selectedLoan) ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setEditingLoanId(selectedLoan.id)}>
                    <PencilLine className="h-4 w-4" />
                    Edit Request
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setDeletingLoanId(selectedLoan.id)}>
                    <Trash2 className="h-4 w-4" />
                    Delete Request
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {isDesktop ? (
        <Dialog
          open={Boolean(editingLoan)}
          onOpenChange={(open) => !open && setEditingLoanId(null)}>
          <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-2xl">
            <DialogHeader className="shrink-0 px-6 pt-6 pr-14">
              <DialogTitle>Edit Loan Request</DialogTitle>
              <DialogDescription>
                Update a pending request before the committee reviews it.
              </DialogDescription>
            </DialogHeader>
            {editingLoan ? (
              <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
                <LoanRequestForm
                  formId="edit-loan-form"
                  hideActions
                  submitLabel="Save Changes"
                  initialValues={editInitialValues}
                  onSubmitLoan={handleEditSubmit}
                  onSuccess={() => setEditingLoanId(null)}
                  onSubmittingChange={setEditSubmitting}
                />
              </div>
            ) : null}
            <DialogFooter className="shrink-0 border-t px-6 py-4">
              <DialogClose asChild>
                <Button
                  variant="outline"
                  disabled={editSubmitting || updateLoan.isPending}>
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                form="edit-loan-form"
                disabled={editSubmitting || updateLoan.isPending}>
                {editSubmitting || updateLoan.isPending ? (
                  <>
                    <Loader className="mr-2 h-4 w-4" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer
          open={Boolean(editingLoan)}
          onOpenChange={(open) => !open && setEditingLoanId(null)}>
          <DrawerContent className="flex max-h-[92vh] flex-col overflow-hidden p-0">
            <DrawerHeader className="shrink-0 border-b bg-muted/40 px-4 py-4 text-left">
              <DrawerTitle>Edit Loan Request</DrawerTitle>
              <DrawerDescription>
                Update a pending request before the committee reviews it.
              </DrawerDescription>
            </DrawerHeader>
            {editingLoan ? (
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                <LoanRequestForm
                  formId="edit-loan-form"
                  hideActions
                  submitLabel="Save Changes"
                  initialValues={editInitialValues}
                  onSubmitLoan={handleEditSubmit}
                  onSuccess={() => setEditingLoanId(null)}
                  onSubmittingChange={setEditSubmitting}
                />
              </div>
            ) : null}
            <DrawerFooter className="shrink-0 border-t bg-background pb-6">
              <Button
                type="submit"
                form="edit-loan-form"
                disabled={editSubmitting || updateLoan.isPending}>
                {editSubmitting || updateLoan.isPending ? (
                  <>
                    <Loader className="mr-2 h-4 w-4" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
              <Button
                variant="outline"
                disabled={editSubmitting || updateLoan.isPending}
                onClick={() => setEditingLoanId(null)}>
                Cancel
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}

      <AlertDialog
        open={Boolean(deletingLoan)}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingLoanId(null)
            setDeleteConfirm("")
          }
        }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete loan request?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the pending request. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Please type <span className="font-mono">{deleteConfirmText}</span>{" "}
              to confirm:
            </p>
            <Input
              type="text"
              value={deleteConfirm}
              onChange={(event) => setDeleteConfirm(event.target.value)}
              placeholder={deleteConfirmText}
              autoComplete="off"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleteLoan.isPending}
              onClick={() => setDeleteConfirm("")}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              className={`bg-destructive text-white hover:bg-destructive/90 ${
                !isDeleteEnabled ? "cursor-not-allowed opacity-50" : ""
              }`}
              disabled={!isDeleteEnabled || deleteLoan.isPending}>
              {deleteLoan.isPending ? (
                <>
                  <Loader className="mr-2 h-4 w-4" />
                  Deleting...
                </>
              ) : (
                "Delete Request"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
