"use client"

import { useState } from "react"
import type { LoanStatus } from "@/db/schemas/loan-schema"
import type { LoanExportable } from "@/utils/loan-export-utils"
import { AlertTriangle, XCircle } from "lucide-react"
import { toast } from "sonner"

import { useMediaQuery } from "@/hooks/use-media-query"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Loader } from "@/components/common/loader"

import { PaymentInfoSection } from "./payment-info-section"

interface LoanReviewDialogProps {
  loan: LoanExportable
  onUpdated?: () => void
}

const statusOptions = [
  { value: "requested", label: "Requested" },
  { value: "disbursed", label: "Disbursed" },
  { value: "repaying", label: "Repaying" },
  { value: "repaid", label: "Repaid" },
  { value: "overdue", label: "Overdue" },
]

const formatRwf = (amount?: string | number | null) => {
  if (amount === null || amount === undefined || amount === "") return "-"
  const value = typeof amount === "number" ? amount : Number.parseFloat(amount)
  if (Number.isNaN(value)) return "-"
  return `${new Intl.NumberFormat("en-RW").format(Math.round(value))} RWF`
}

function defaultDueDateFromTerm(termMonths?: number | null): string {
  if (!termMonths) return ""
  const d = new Date()
  d.setMonth(d.getMonth() + termMonths)
  return d.toISOString().slice(0, 10)
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function LoanReviewDialog({ loan, onUpdated }: LoanReviewDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const [open, setOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState<LoanStatus>(loan.status)
  const [formState, setFormState] = useState({
    approvedAmount: loan.approvedAmount
      ? String(Math.floor(Number.parseFloat(loan.approvedAmount)))
      : "",
    approvedAt: loan.approvedAt
      ? new Date(loan.approvedAt).toISOString().slice(0, 10)
      : "",
    disbursedAt: loan.disbursedAt
      ? new Date(loan.disbursedAt).toISOString().slice(0, 10)
      : "",
    repaidAt: loan.repaidAt
      ? new Date(loan.repaidAt).toISOString().slice(0, 10)
      : "",
    dueDate: loan.dueDate
      ? new Date(loan.dueDate).toISOString().slice(0, 10)
      : defaultDueDateFromTerm(loan.termMonths),
    notes: loan.notes || "",
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const isRejected = loan.status === "rejected" && !!loan.notes?.trim()

  // ─── field visibility per chosen status ───────────────────────────────────
  const showApprovedAmount = [
    "approved",
    "disbursed",
    "repaying",
    "repaid",
    "overdue",
  ].includes(status)
  const showApprovedAt = status === "approved"
  const showDisbursedAt = status === "disbursed"
  const showDueDate = ["approved", "disbursed", "repaying", "overdue"].includes(
    status
  )
  const showRepaidAt = status === "repaid"

  // ─── required fields per status ───────────────────────────────────────────
  const approvedAmountRequired = ["approved", "disbursed"].includes(status)
  const approvedAtRequired = status === "approved"
  const disbursedAtRequired = status === "disbursed"
  const repaidAtRequired = status === "repaid"

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    const today = todayIso()

    if (approvedAmountRequired && !formState.approvedAmount.trim()) {
      errors.approvedAmount = "Approved amount is required"
    }

    if (approvedAtRequired && !formState.approvedAt) {
      errors.approvedAt = "Approval date is required"
    }

    if (disbursedAtRequired) {
      if (!formState.disbursedAt) {
        errors.disbursedAt = "Disbursement date is required"
      } else if (formState.disbursedAt > today) {
        errors.disbursedAt = "Disbursement date cannot be in the future"
      }
    }

    if (repaidAtRequired) {
      if (!formState.repaidAt) {
        errors.repaidAt = "Repayment completion date is required"
      } else if (formState.repaidAt > today) {
        errors.repaidAt = "Repayment date cannot be in the future"
      }
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const doSubmit = async () => {
    setConfirmOpen(false)
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/loans/${loan.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          status,
          approvedAmount: showApprovedAmount
            ? formState.approvedAmount.trim() || undefined
            : undefined,
          approvedAt:
            showApprovedAt && formState.approvedAt
              ? new Date(formState.approvedAt)
              : undefined,
          disbursedAt:
            showDisbursedAt && formState.disbursedAt
              ? new Date(formState.disbursedAt)
              : undefined,
          repaidAt:
            showRepaidAt && formState.repaidAt
              ? new Date(formState.repaidAt)
              : undefined,
          dueDate:
            showDueDate && formState.dueDate
              ? new Date(formState.dueDate)
              : undefined,
          notes: formState.notes.trim() || undefined,
        }),
      })

      if (!response.ok) throw new Error("Failed to update loan")

      toast.success("Loan updated")
      setOpen(false)
      onUpdated?.()
    } catch (error) {
      console.error(error)
      toast.error("Unable to update loan")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async () => {
    if (isRejected) return
    if (!validateForm()) return
    // Warn if disbursing a loan that was never formally approved by the president
    if (status === "disbursed" && loan.status !== "approved") {
      setConfirmOpen(true)
      return
    }
    await doSubmit()
  }

  const field = (
    id: string,
    label: string,
    required: boolean,
    children: React.ReactNode,
    error?: string
  ) => (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required ? (
          <span className="ml-1 text-red-500">*</span>
        ) : (
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            (optional)
          </span>
        )}
      </Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )

  const formContent = (
    <div className="space-y-5">
      {/* Rejection notice */}
      {isRejected && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <div className="space-y-1">
            <p className="font-semibold">Loan rejected by president</p>
            <p className="text-xs leading-relaxed">
              Rejection reason:{" "}
              <span className="font-medium italic">
                &ldquo;{loan.notes}&rdquo;
              </span>
            </p>
            <p className="text-xs text-red-600/80 dark:text-red-500/80">
              This loan cannot be updated further.
            </p>
          </div>
        </div>
      )}

      {/* Loan summary */}
      <div className="rounded-lg border bg-muted/30 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Loan Summary
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1.5 text-sm ">
          <div>
            <p className="text-xs text-muted-foreground">Requested</p>
            <p className="font-medium tabular-nums">
              {formatRwf(loan.requestedAmount)}
            </p>
          </div>
          {loan.approvedAmount && (
            <div>
              <p className="text-xs text-muted-foreground">Approved</p>
              <p className="font-medium tabular-nums">
                {formatRwf(loan.approvedAmount)}
              </p>
            </div>
          )}
          {loan.termMonths && (
            <div>
              <p className="text-xs text-muted-foreground">Term</p>
              <p className="font-medium">{loan.termMonths} months</p>
            </div>
          )}
          {loan.interestRate && (
            <div>
              <p className="text-xs text-muted-foreground">Interest Rate</p>
              <p className="font-medium">
                {(() => {
                  const v = Number.parseFloat(String(loan.interestRate))
                  return Number.isFinite(v)
                    ? `${(v <= 1 ? v * 100 : v).toFixed(0)}%`
                    : "-"
                })()}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="space-y-2">
        <Label>Status</Label>
        <Select
          value={status}
          disabled={isRejected}
          onValueChange={(value) => {
            setStatus(value as LoanStatus)
            setFormErrors({})
          }}>
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
            {isRejected && <SelectItem value="rejected">Rejected</SelectItem>}
          </SelectContent>
        </Select>
      </div>

      {/* Conditional fields */}
      {showApprovedAmount &&
        field(
          "approvedAmount",
          "Approved Amount",
          approvedAmountRequired,
          <Input
            id="approvedAmount"
            name="approvedAmount"
            inputMode="decimal"
            disabled={isRejected}
            value={formState.approvedAmount}
            onChange={(e) =>
              setFormState((prev) => ({
                ...prev,
                approvedAmount: e.target.value,
              }))
            }
            placeholder={`${loan.requestedAmount}...`}
            className={formErrors.approvedAmount ? "border-red-500" : ""}
          />,
          formErrors.approvedAmount
        )}

      {showApprovedAt &&
        field(
          "approvedAt",
          "Approval Date",
          approvedAtRequired,
          <Input
            id="approvedAt"
            name="approvedAt"
            type="date"
            disabled={isRejected}
            value={formState.approvedAt}
            onChange={(e) =>
              setFormState((prev) => ({ ...prev, approvedAt: e.target.value }))
            }
            className={formErrors.approvedAt ? "border-red-500" : ""}
          />,
          formErrors.approvedAt
        )}

      {showDisbursedAt &&
        field(
          "disbursedAt",
          "Disbursement Date",
          disbursedAtRequired,
          <Input
            id="disbursedAt"
            name="disbursedAt"
            type="date"
            disabled={isRejected}
            value={formState.disbursedAt}
            onChange={(e) =>
              setFormState((prev) => ({ ...prev, disbursedAt: e.target.value }))
            }
            className={formErrors.disbursedAt ? "border-red-500" : ""}
          />,
          formErrors.disbursedAt
        )}

      {showDueDate &&
        field(
          "dueDate",
          "Due Date",
          false,
          <Input
            id="dueDate"
            name="dueDate"
            type="date"
            disabled={isRejected}
            value={formState.dueDate}
            onChange={(e) =>
              setFormState((prev) => ({ ...prev, dueDate: e.target.value }))
            }
          />
        )}

      {showRepaidAt &&
        field(
          "repaidAt",
          "Repayment Completion Date",
          repaidAtRequired,
          <Input
            id="repaidAt"
            name="repaidAt"
            type="date"
            disabled={isRejected}
            value={formState.repaidAt}
            onChange={(e) =>
              setFormState((prev) => ({ ...prev, repaidAt: e.target.value }))
            }
            className={formErrors.repaidAt ? "border-red-500" : ""}
          />,
          formErrors.repaidAt
        )}

      {/* Notes — always shown */}
      {!isRejected && (
        <div className="space-y-2">
          <Label htmlFor="notes">
            Notes
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              (optional)
            </span>
          </Label>
          <Textarea
            id="notes"
            name="notes"
            rows={3}
            value={formState.notes}
            onChange={(e) =>
              setFormState((prev) => ({ ...prev, notes: e.target.value }))
            }
            placeholder="Additional notes..."
          />
        </div>
      )}
    </div>
  )

  const actionButtons = (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(false)}
        disabled={isSubmitting}>
        Cancel
      </Button>
      <Button onClick={handleSubmit} disabled={isSubmitting || isRejected}>
        {isSubmitting ? (
          <>
            <Loader className="mr-2 h-4 w-4" />
            Updating...
          </>
        ) : isRejected ? (
          "Loan Rejected"
        ) : (
          "Update Loan"
        )}
      </Button>
    </>
  )

  const reviewTriggerButton = (
    <Button
      variant="default"
      size="sm"
      data-row-click-ignore="true"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}>
      Review
    </Button>
  )

  const confirmBody = (
    <div className="space-y-3">
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <div className="space-y-1">
          <p className="font-semibold">Disbursing without president approval</p>
          <p className="text-xs leading-relaxed">
            This loan has not been formally approved by the president — its
            current status is <span className="font-medium">{loan.status}</span>
            . Disbursing without approval bypasses the standard review process.
          </p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        You can wait for the president to approve the loan first, or proceed
        with disbursement at your own discretion.
      </p>
    </div>
  )

  const confirmButtons = (proceed: () => void, cancel: () => void) => (
    <>
      <Button variant="outline" onClick={cancel}>
        Wait for Approval
      </Button>
      <Button variant="destructive" onClick={proceed} disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader className="mr-2 h-4 w-4" />
            Disbursing...
          </>
        ) : (
          "Proceed Anyway"
        )}
      </Button>
    </>
  )

  if (isDesktop) {
    return (
      <>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>{reviewTriggerButton}</DialogTrigger>
          <DialogContent
            className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden p-0 sm:max-w-3xl"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}>
            <DialogHeader className="shrink-0 border-b px-6 py-4 pr-14">
              <DialogTitle>Review Loan Request</DialogTitle>
              <DialogDescription>
                Adjust repayment details before disbursement.
              </DialogDescription>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              {formContent}
            </div>

            <DialogFooter className="shrink-0 border-t px-6 py-4">
              {actionButtons}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Skip President Approval?</DialogTitle>
              <DialogDescription>
                Review the warning below before proceeding.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">{confirmBody}</div>
            <DialogFooter>
              {confirmButtons(doSubmit, () => setConfirmOpen(false))}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{reviewTriggerButton}</DrawerTrigger>
        <DrawerContent
          className="flex max-h-[92vh] flex-col overflow-hidden p-0"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}>
          <DrawerHeader className="shrink-0 border-b bg-muted/40 px-4 py-4 text-left">
            <DrawerTitle>Review Loan Request</DrawerTitle>
            <DrawerDescription>
              Approve, reject, or adjust repayment details before disbursement.
            </DrawerDescription>
          </DrawerHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {formContent}
          </div>

          <DrawerFooter className="shrink-0 border-t bg-background pb-6">
            {actionButtons}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Drawer open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DrawerContent className="p-0">
          <DrawerHeader className="border-b bg-muted/40 px-4 py-4 text-left">
            <DrawerTitle>Skip President Approval?</DrawerTitle>
            <DrawerDescription>
              Review the warning below before proceeding.
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 py-4">{confirmBody}</div>
          <DrawerFooter className="border-t bg-background pb-6">
            {confirmButtons(doSubmit, () => setConfirmOpen(false))}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  )
}
