"use client"

import { useState } from "react"
import type { LoanExportable } from "@/utils/loan-export-utils"
import { Banknote, Calendar, Info, User } from "lucide-react"
import { toast } from "sonner"

import { useMediaQuery } from "@/hooks/use-media-query"
import { Badge } from "@/components/ui/badge"
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
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Loader } from "@/components/common/loader"

import { PaymentInfoSection } from "./payment-info-section"

interface LoanDisburseDialogProps {
  loan: LoanExportable
  onUpdated?: () => void
}

const formatRwf = (amount?: string | null) => {
  if (!amount) return "-"
  const value = Number.parseFloat(amount)
  if (Number.isNaN(value)) return amount
  return `${new Intl.NumberFormat("en-RW").format(value)}\u00A0RWF`
}

const formatDate = (value?: string | Date | null) => {
  if (!value) return "-"
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleDateString("en-RW")
}

const parseAmount = (value?: string | number | null) => {
  if (value === null || value === undefined) return null
  const amount =
    typeof value === "number" ? value : Number.parseFloat(String(value))
  return Number.isFinite(amount) ? amount : null
}

const normalizeInterestPercent = (value?: string | number | null) => {
  if (value === null || value === undefined) return null
  const parsed =
    typeof value === "number" ? value : Number.parseFloat(String(value))
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return parsed <= 1 ? parsed * 100 : parsed
}

const formatInterestRate = (value?: string | number | null) => {
  const percent = normalizeInterestPercent(value)
  if (percent === null) return "-"
  return `${new Intl.NumberFormat("en-RW", {
    maximumFractionDigits: 2,
  }).format(percent)}%`
}

export function LoanDisburseDialog({
  loan,
  onUpdated,
}: LoanDisburseDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [disbursedAt, setDisbursedAt] = useState(
    new Date().toISOString().slice(0, 10)
  )
  const [dueDate, setDueDate] = useState(
    loan.dueDate ? new Date(loan.dueDate).toISOString().slice(0, 10) : ""
  )
  const [interestRate, setInterestRate] = useState(loan.interestRate ?? "")
  const [notes, setNotes] = useState(loan.notes ?? "")
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    const today = new Date().toISOString().slice(0, 10)

    // Validate disbursedAt
    if (!disbursedAt) {
      errors.disbursedAt = "Disbursement date is required"
    } else if (disbursedAt > today) {
      errors.disbursedAt = "Disbursement date cannot be in the future"
    }

    // Validate interestRate if provided
    if (interestRate.trim()) {
      const rate = Number.parseFloat(interestRate)
      if (Number.isNaN(rate) || rate < 0 || rate > 1) {
        errors.interestRate =
          "Interest rate must be between 0 and 1 (e.g., 0.05 for 5%)"
      }
    }

    // Validate dueDate vs disbursedAt if provided
    if (dueDate && disbursedAt && dueDate < disbursedAt) {
      errors.dueDate = "Due date cannot be before disbursement date"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleDisburse = async () => {
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/loans/${loan.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          status: "disbursed",
          disbursedAt: new Date(disbursedAt),
          dueDate: dueDate ? new Date(dueDate) : undefined,
          interestRate: interestRate.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const err = (await response.json().catch(() => null)) as {
          error?: { message?: string }
        } | null
        throw new Error(err?.error?.message ?? "Failed to disburse loan")
      }

      toast.success("Loan disbursed successfully")
      setOpen(false)
      onUpdated?.()
    } catch (error) {
      console.error(error)
      toast.error(
        error instanceof Error ? error.message : "Unable to disburse loan"
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const disbursalAmount = loan.approvedAmount ?? loan.requestedAmount
  const principalAmount = parseAmount(disbursalAmount)
  const effectiveInterestInput =
    interestRate.trim() || loan.interestRate || null
  const interestPercent = normalizeInterestPercent(effectiveInterestInput)
  const interestAmount =
    principalAmount !== null && interestPercent !== null
      ? Math.round((principalAmount * interestPercent) / 100)
      : null
  const totalRepayment =
    principalAmount !== null && interestAmount !== null
      ? principalAmount + interestAmount
      : null
  const estimatedMonthlyPayment =
    totalRepayment !== null && loan.termMonths
      ? Math.ceil(totalRepayment / loan.termMonths)
      : null

  const disburseTriggerButton = (
    <Button size="sm" className="gap-1.5">
      <Banknote className="h-3.5 w-3.5" />
      Disburse
    </Button>
  )

  const repaymentPreviewTooltip = (
    <TooltipContent side="top" align="end" className="max-w-72 p-3 text-left">
      <p className="mb-1 text-xs font-semibold">Repayment Preview</p>
      <div className="space-y-0.5 text-xs">
        <p>
          Principal:{" "}
          {principalAmount !== null ? formatRwf(String(principalAmount)) : "-"}
        </p>
        <p>Rate: {formatInterestRate(effectiveInterestInput)}</p>
        <p>
          Interest:{" "}
          {interestAmount !== null ? formatRwf(String(interestAmount)) : "-"}
        </p>
        <p>
          Total:{" "}
          {totalRepayment !== null ? formatRwf(String(totalRepayment)) : "-"}
        </p>
        <p>
          Monthly:{" "}
          {estimatedMonthlyPayment !== null
            ? `${formatRwf(String(estimatedMonthlyPayment))} / month`
            : "Set term to estimate"}
        </p>
      </div>
    </TooltipContent>
  )

  const content = (
    <>
      <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium leading-tight">
                {loan.memberName ?? "Member"}
              </p>
              <p className="text-xs text-muted-foreground">
                {loan.memberEmail ?? loan.memberId}
              </p>
            </div>
          </div>
          <Badge className="shrink-0 bg-emerald-100 text-emerald-700">
            Approved
          </Badge>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Disburse Amount</p>
            <p className="text-base font-semibold tabular-nums">
              {formatRwf(disbursalAmount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Interest Rate</p>
            <p className="font-medium">
              {formatInterestRate(effectiveInterestInput)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Term</p>
            <p className="font-medium">
              {loan.termMonths ? `${loan.termMonths} months` : "-"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Due Date</p>
            <p className="font-medium">{formatDate(loan.dueDate)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Principal Used</p>
            <p className="font-medium tabular-nums">
              {principalAmount !== null
                ? formatRwf(String(principalAmount))
                : "-"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Interest Amount</p>
            <p className="font-medium tabular-nums">
              {interestAmount !== null
                ? formatRwf(String(interestAmount))
                : "-"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total to Repay</p>
            <p className="font-semibold tabular-nums">
              {totalRepayment !== null
                ? formatRwf(String(totalRepayment))
                : "-"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              Estimated Monthly Payment
            </p>
            <p className="font-medium tabular-nums">
              {estimatedMonthlyPayment !== null
                ? `${formatRwf(String(estimatedMonthlyPayment))} / month`
                : loan.termMonths
                  ? "-"
                  : "Set term to estimate"}
            </p>
          </div>
        </div>

        {loan.approvedByName ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Info className="h-3 w-3" />
            Approved by {loan.approvedByName}
          </div>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Member Payout Details
        </p>
        <PaymentInfoSection
          ikimina={loan.memberIkiminaProfile}
          memberName={loan.memberName}
          maskAccount={false}
        />
      </div>

      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="disbursedAt" className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Disbursement Date
          </Label>
          <Input
            id="disbursedAt"
            type="date"
            value={disbursedAt}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDisbursedAt(e.target.value)}
            className={formErrors.disbursedAt ? "border-red-500" : ""}
          />
          {formErrors.disbursedAt && (
            <p className="text-xs text-red-500">{formErrors.disbursedAt}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueDate">Due Date (optional)</Label>
          <Input
            id="dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={formErrors.dueDate ? "border-red-500" : ""}
          />
          {formErrors.dueDate && (
            <p className="text-xs text-red-500">{formErrors.dueDate}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="interestRate">Interest Rate (optional)</Label>
          <Input
            id="interestRate"
            inputMode="decimal"
            value={interestRate}
            onChange={(e) => setInterestRate(e.target.value)}
            placeholder="0.05"
            className={formErrors.interestRate ? "border-red-500" : ""}
          />
          <p className="text-xs text-muted-foreground">
            Use decimal format, e.g. 0.05 for 5%.
          </p>
          {formErrors.interestRate && (
            <p className="text-xs text-red-500">{formErrors.interestRate}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="disburse-notes">Notes</Label>
          <Textarea
            id="disburse-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Transfer reference, bank details, etc."
          />
        </div>
      </div>
    </>
  )

  const actions = (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(false)}
        disabled={isSubmitting}>
        Cancel
      </Button>
      <Button onClick={() => void handleDisburse()} disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader className="mr-2 h-4 w-4" />
            Processing...
          </>
        ) : (
          <>
            <Banknote className="mr-2 h-4 w-4" />
            Confirm Disbursement
          </>
        )}
      </Button>
    </>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>{disburseTriggerButton}</DialogTrigger>
          </TooltipTrigger>
          {repaymentPreviewTooltip}
        </Tooltip>
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-lg flex-col overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b px-6 py-4 pr-14">
            <DialogTitle>Confirm Disbursement</DialogTitle>
            <DialogDescription>
              Record that funds have been transferred to the member&apos;s
              account.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {content}
          </div>

          <DialogFooter className="shrink-0 border-t px-6 py-4">
            {actions}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DrawerTrigger asChild>{disburseTriggerButton}</DrawerTrigger>
        </TooltipTrigger>
        {repaymentPreviewTooltip}
      </Tooltip>
      <DrawerContent className="flex max-h-[calc(100dvh-0.75rem)] flex-col overflow-hidden p-0">
        <DrawerHeader className="border-b bg-muted/40 px-4 py-4 text-left">
          <DrawerTitle>Confirm Disbursement</DrawerTitle>
          <DrawerDescription>
            Record that funds have been transferred to the member&apos;s
            account.
          </DrawerDescription>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="space-y-4">{content}</div>
        </div>

        <DrawerFooter className="shrink-0 border-t bg-background pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {actions}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
