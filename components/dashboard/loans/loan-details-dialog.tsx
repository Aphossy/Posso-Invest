"use client"

import { useEffect, useState, type ReactNode } from "react"
import type { AuditLog } from "@/db/schemas"
import type { LoanExportable } from "@/utils/loan-export-utils"
import { CheckCircle2, Clock, Eye, XCircle } from "lucide-react"

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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { LoanApproveDialog } from "./loan-approve-dialog"
import { LoanReviewDialog } from "./loan-review-dialog"
import { PaymentInfoSection } from "./payment-info-section"

interface LoanDetailsDialogProps {
  loan?: LoanExportable | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: ReactNode | null
  onUpdated?: () => void
  /** When true, shows the full treasurer Review button instead of the president Approve/Reject button */
  canReview?: boolean
}

const statusStyles: Record<string, string> = {
  requested: "bg-slate-100 text-slate-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
  disbursed: "bg-blue-100 text-blue-700",
  repaying: "bg-amber-100 text-amber-700",
  repaid: "bg-emerald-100 text-emerald-700",
  overdue: "bg-rose-100 text-rose-700",
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

export function LoanDetailsDialog({
  loan,
  open,
  onOpenChange,
  trigger,
  onUpdated,
  canReview,
}: LoanDetailsDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const [internalOpen, setInternalOpen] = useState(false)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [auditLoading, setAuditLoading] = useState(false)

  const isControlled = open !== undefined
  const resolvedOpen = isControlled ? open : internalOpen

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(nextOpen)
    }
    onOpenChange?.(nextOpen)
  }

  useEffect(() => {
    if (!resolvedOpen || !loan?.id) return
    setAuditLoading(true)
    fetch(`/api/loans/${loan.id}/audit-logs`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setAuditLogs(json.data ?? [])
      })
      .catch(() => {})
      .finally(() => setAuditLoading(false))
  }, [resolvedOpen, loan?.id])

  if (!loan) return null

  const defaultTriggerButton = (
    <Button variant="outline" size="sm">
      <Eye className="mr-1.5 h-4 w-4" />
      View
    </Button>
  )

  const isDefaultTrigger = trigger === undefined
  const triggerElement = isDefaultTrigger ? defaultTriggerButton : trigger

  const approvedAmount = parseAmount(loan.approvedAmount)
  const requestedAmount = parseAmount(loan.requestedAmount)
  const principalAmount = approvedAmount ?? requestedAmount
  const principalSource = approvedAmount !== null ? "approved" : "requested"
  const interestPercent = normalizeInterestPercent(loan.interestRate)
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

  const repaymentPreviewTooltip = (
    <TooltipContent side="top" align="end" className="max-w-72 p-3 text-left">
      <p className="mb-1 text-xs font-semibold">Repayment Preview</p>
      <div className="space-y-0.5 text-xs">
        <p>
          Principal:{" "}
          {principalAmount !== null ? formatRwf(String(principalAmount)) : "-"}
        </p>
        <p>Rate: {formatInterestRate(loan.interestRate)}</p>
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

  const detailsContent = (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">
              {loan.memberName || "Member"}
            </p>
            <p className="text-xs text-muted-foreground">
              {loan.memberEmail || loan.memberId}
            </p>
          </div>
          <Badge className={statusStyles[loan.status] || ""}>
            {loan.status}
          </Badge>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Requested Amount</p>
          <p className="font-medium tabular-nums">
            {formatRwf(loan.requestedAmount)}
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Approved Amount</p>
          <p className="font-medium tabular-nums">
            {formatRwf(loan.approvedAmount)}
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Interest Rate</p>
          <p className="font-medium">{formatInterestRate(loan.interestRate)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Term</p>
          <p className="font-medium">
            {loan.termMonths ? `${loan.termMonths} months` : "-"}
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Requested At</p>
          <p className="font-medium">{formatDate(loan.requestedAt)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Due Date</p>
          <p className="font-medium">{formatDate(loan.dueDate)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Approved At</p>
          <p className="font-medium">{formatDate(loan.approvedAt)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Disbursed At</p>
          <p className="font-medium">{formatDate(loan.disbursedAt)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Repaid At</p>
          <p className="font-medium">{formatDate(loan.repaidAt)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Currency</p>
          <p className="font-medium">{loan.currency || "RWF"}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Principal Used</p>
          <p className="font-medium tabular-nums">
            {principalAmount !== null
              ? formatRwf(String(principalAmount))
              : "-"}
          </p>
          <p className="text-xs text-muted-foreground">
            Based on {principalSource} amount
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Interest Amount</p>
          <p className="font-medium tabular-nums">
            {interestAmount !== null ? formatRwf(String(interestAmount)) : "-"}
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Total to Repay</p>
          <p className="font-semibold tabular-nums">
            {totalRepayment !== null ? formatRwf(String(totalRepayment)) : "-"}
          </p>
        </div>
        <div className="rounded-lg border p-3">
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

      <div className="rounded-lg border p-3">
        <p className="text-xs text-muted-foreground">Purpose</p>
        <p className="text-sm">
          {loan.metadata?.reason || "No purpose provided."}
        </p>
      </div>

      <div className="rounded-lg border p-3">
        <p className="text-xs text-muted-foreground">Repayment Plan</p>
        <p className="text-sm">
          {loan.metadata?.repaymentPlan || "No repayment plan provided."}
        </p>
      </div>

      <div className="rounded-lg border p-3">
        <p className="text-xs text-muted-foreground">
          {loan.status === "rejected"
            ? "Rejection Reason"
            : loan.status === "approved" ||
                loan.status === "disbursed" ||
                loan.status === "repaying" ||
                loan.status === "repaid" ||
                loan.status === "overdue"
              ? "Approval Notes"
              : "Notes"}
        </p>
        <p className="text-sm">{loan.notes?.trim() || "No notes provided."}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">
            {loan.status === "rejected" ? "Rejected By" : "Approved By"}
          </p>
          <p className="font-medium">{loan.approvedByName || "-"}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Disbursed By</p>
          <p className="font-medium">{loan.disbursedByName || "-"}</p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Member Payout Details
        </p>
        <PaymentInfoSection
          ikimina={loan.memberIkiminaProfile}
          memberName={loan.memberName}
          maskAccount={false}
        />
      </div>

      {/* Audit trail */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Activity
        </p>
        {auditLoading ? (
          <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 animate-spin" />
            Loading activity...
          </div>
        ) : auditLogs.length === 0 ? (
          <p className="py-2 text-xs text-muted-foreground">
            No activity recorded yet.
          </p>
        ) : (
          <ol className="relative border-l border-border pl-4">
            {auditLogs.map((log) => {
              const meta = log.metadata as Record<string, any> | null
              const isPositive = ["approved", "disbursed", "repaid"].includes(
                meta?.newStatus ?? ""
              )
              const isNegative = ["rejected", "overdue"].includes(
                meta?.newStatus ?? ""
              )
              return (
                <li key={log.id} className="mb-4 ml-2 last:mb-0">
                  <span className="absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full border border-background bg-background">
                    {isPositive ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : isNegative ? (
                      <XCircle className="h-3.5 w-3.5 text-rose-500" />
                    ) : (
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </span>
                  <p className="text-sm font-medium leading-snug">
                    {log.details}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {meta?.actorName ?? "System"}
                    {meta?.actorRole ? ` · ${meta.actorRole}` : ""}
                    {" · "}
                    {new Date(log.createdAt).toLocaleString("en-RW", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </div>
  )

  if (isDesktop) {
    return (
      <Dialog open={resolvedOpen} onOpenChange={handleOpenChange}>
        {triggerElement ? (
          isDefaultTrigger ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <DialogTrigger asChild>{triggerElement}</DialogTrigger>
              </TooltipTrigger>
              {repaymentPreviewTooltip}
            </Tooltip>
          ) : (
            <DialogTrigger asChild>{triggerElement}</DialogTrigger>
          )
        ) : null}
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="shrink-0 border-b px-6 py-4 pr-14">
            <DialogTitle>Loan Details</DialogTitle>
            <DialogDescription>
              Review full request and approval details for this loan.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {detailsContent}
          </div>

          <DialogFooter className="shrink-0 border-t px-6 py-4">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Close
            </Button>
            {onUpdated && canReview && (
              <LoanReviewDialog
                loan={loan}
                onUpdated={() => {
                  onUpdated()
                  handleOpenChange(false)
                }}
              />
            )}
            {onUpdated && !canReview && loan.status === "requested" && (
              <LoanApproveDialog
                loan={loan}
                onUpdated={() => {
                  onUpdated()
                  handleOpenChange(false)
                }}
              />
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={resolvedOpen} onOpenChange={handleOpenChange}>
      {triggerElement ? (
        isDefaultTrigger ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <DrawerTrigger asChild>{triggerElement}</DrawerTrigger>
            </TooltipTrigger>
            {repaymentPreviewTooltip}
          </Tooltip>
        ) : (
          <DrawerTrigger asChild>{triggerElement}</DrawerTrigger>
        )
      ) : null}
      <DrawerContent className="flex max-h-[calc(100dvh-0.75rem)] flex-col overflow-hidden p-0">
        <DrawerHeader className="border-b bg-muted/40 px-4 py-4 text-left">
          <DrawerTitle>Loan Details</DrawerTitle>
          <DrawerDescription>
            Review full request and approval details for this loan.
          </DrawerDescription>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {detailsContent}
        </div>

        <DrawerFooter className="shrink-0 border-t bg-background pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {onUpdated && canReview && (
            <LoanReviewDialog
              loan={loan}
              onUpdated={() => {
                onUpdated()
                handleOpenChange(false)
              }}
            />
          )}
          {onUpdated && !canReview && loan.status === "requested" && (
            <LoanApproveDialog
              loan={loan}
              onUpdated={() => {
                onUpdated()
                handleOpenChange(false)
              }}
            />
          )}
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Close
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
